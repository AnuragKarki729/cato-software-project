import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VideoTrim } from 'react-video-trim';
import { trimVideo } from 'react-video-trim/plugins/webcodecs';
import 'react-video-trim/style.css';
import { api } from '../../api';

const MAX_SECONDS = 20;

const OnboardingVideo = () => {
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [showTrimming, setShowTrimming] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  // One blob URL per chosen file, not one per render.
  const trimUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setError('');
    setMessage('');
    setFile(null);
    setShowTrimming(false);

    // Hidden video element to read the metadata
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(selectedFile);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const { videoWidth, videoHeight, duration: vidDuration } = video;

      if (videoWidth > videoHeight) {
        setMessage('Please choose a portrait video.');
        return;
      }

      setFile(selectedFile);
      setDuration(vidDuration);
      if (vidDuration > MAX_SECONDS) {
        setShowTrimming(true);
        setMessage('Select the beginning and end of a 20-second clip, then trim it.');
      } else {
        setMessage('Your video is ready to upload.');
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not read video metadata. Please try another file.');
    };
  };

  const trimInBrowser = async (range) => {
    if (isTrimming) return;

    const clipLength = range.endTime - range.startTime;
    if (clipLength <= 0 || clipLength > MAX_SECONDS) {
      setError('Please select a clip that is 20 seconds or less.');
      return;
    }

    try {
      setIsTrimming(true);
      setError('');
      setMessage('Creating your trimmed video…');

      const result = await trimVideo(file, { ...range, outputFormat: 'mp4' });
      const trimmedFile = new File([result.blob], 'pitch.mp4', { type: 'video/mp4' });

      setFile(trimmedFile);
      setDuration(clipLength);
      setShowTrimming(false);
      setMessage('Your 20-second clip is ready to upload.');
    } catch {
      setError('Could not trim this video. Please try another video or use Chrome/Edge.');
      setMessage('');
    } finally {
      setIsTrimming(false);
    }
  };

  const onCancelTrimming = () => {
    setShowTrimming(false);
    setFile(null);
    setMessage('');
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file || isUploading || showTrimming) return;

    try {
      setIsUploading(true);
      setError('');

      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'pitch');
      form.append('duration_seconds', duration.toFixed(1));

      await api.post('/videos', form);
      navigate('/feed');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="center">Introduce yourself</h1>
      <p className="muted">Anurag Karki, 6838852</p>
      <p className="muted">Responsibility 1 (Video upload and video retrieval)</p>
      <p className="muted">Step 2 of 2: record a portrait pitch or choose one. Keep it to 20 seconds or less.</p>

      <form className="card stack" onSubmit={upload}>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          capture="user"
          onChange={handleFileChange}
        />

        {message && <p className="muted" role="status">{message}</p>}
        {error && <p className="error">{error}</p>}

        {showTrimming && trimUrl && (
          <div className="trim-box">
            <VideoTrim
              src={trimUrl}
              onTrim={trimInBrowser}
              onCancel={onCancelTrimming}
              maxDuration={MAX_SECONDS}
            />
          </div>
        )}

        <button
          type="submit"
          className="btn"
          disabled={!file || isUploading || showTrimming}
        >
          {isUploading ? 'Uploading…' : 'Upload video'}
        </button>
      </form>

      <Link to="/onboarding/profile" className="btn btn-secondary">Back</Link>
    </div>
  );
};

export default OnboardingVideo;
