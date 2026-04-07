import { useState, useEffect } from 'react';
import { ListFiles, SelectDirectory, DownloadFiles, CaptureScreen, RecordScreen, StopScreenRecord } from "../../wailsjs/go/main/App";
import { FolderIcon, FileIcon, BackIcon, UpIcon, PrevIcon } from './Icons';

export default function FileExplorer({ deviceId, onBack }) {
    const [currentPath, setCurrentPath] = useState("/sdcard/");
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);

    // Media capturing state
    const [mediaDestDir, setMediaDestDir] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    const fetchFiles = async (targetPath) => {
        setLoading(true);
        setError(null);
        try {
            const tempFiles = await ListFiles(deviceId, targetPath);
            setFiles(tempFiles || []);
            setCurrentPath(targetPath);
            setSelectedFiles([]); // Reset selection when navigating
        } catch (err) {
            setError("Failed to fetch files: " + err.toString());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles("/sdcard/");
    }, [deviceId]);

    const handleFileClick = (file) => {
        if (file.isDir) {
            setHistory(prev => [...prev, currentPath]);
            const newPath = currentPath.endsWith('/') 
                ? `${currentPath}${file.name}/` 
                : `${currentPath}/${file.name}/`;
            fetchFiles(newPath);
        }
    };

    const handlePathChange = (e) => {
        if (e.key === 'Enter') {
            setHistory(prev => [...prev, currentPath]);
            fetchFiles(currentPath);
        }
    };

    const handleGo = () => {
        setHistory(prev => [...prev, currentPath]);
        fetchFiles(currentPath);
    };

    const handlePrevious = () => {
        if (history.length > 0) {
            const newHistory = [...history];
            const prevPath = newHistory.pop();
            setHistory(newHistory);
            fetchFiles(prevPath);
        }
    };

    const handleUp = () => {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            setHistory(prev => [...prev, currentPath]);
            parts.pop();
            const parentPath = "/" + parts.join('/') + (parts.length > 0 ? "/" : "");
            fetchFiles(parentPath);
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedFiles(files.map(f => f.name));
        } else {
            setSelectedFiles([]);
        }
    };

    const toggleSelectFile = (e, name) => {
        e.stopPropagation();
        if (e.target.checked) {
            setSelectedFiles(prev => [...prev, name]);
        } else {
            setSelectedFiles(prev => prev.filter(f => f !== name));
        }
    };
    
    const handleDownload = async () => {
        let dest = localStorage.getItem("adbDownloadDest");
        if (!dest) {
            try {
                dest = await SelectDirectory();
                if (!dest) return;
                localStorage.setItem("adbDownloadDest", dest);
            } catch (err) {
                setError("Failed to select dir: " + err);
                return;
            }
        }
        
        setIsDownloading(true);
        setError(null);
        try {
            const fullPaths = selectedFiles.map(name => currentPath.endsWith('/') ? currentPath + name : currentPath + '/' + name);
            await DownloadFiles(deviceId, fullPaths, dest);
            setSelectedFiles([]);
            alert("Files downloaded successfully to " + dest);
        } catch (err) {
            setError("Download failed: " + err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleChangeDest = async () => {
        try {
            const dest = await SelectDirectory();
            if (dest) {
                localStorage.setItem("adbDownloadDest", dest);
            }
        } catch (err) {
            setError("Failed to change directory: " + err);
        }
    };

    const getOrSelectMediaDest = async () => {
        if (mediaDestDir) return mediaDestDir;
        try {
            const dest = await SelectDirectory();
            if (dest) {
                setMediaDestDir(dest);
                return dest;
            }
        } catch (err) {
            setError("Failed to select media directory: " + err);
        }
        return null;
    };

    const handleCaptureScreen = async () => {
        const dest = await getOrSelectMediaDest();
        if (!dest) return;

        setIsCapturing(true);
        setError(null);
        try {
            await CaptureScreen(deviceId, dest);
            alert("Screenshot saved successfully to " + dest);
        } catch (err) {
            setError("Failed to capture screen: " + err);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            try {
                await StopScreenRecord(deviceId);
                // State will be updated in the original call's finally block
            } catch (err) {
                setError("Failed to stop recording: " + err);
            }
            return;
        }

        const dest = await getOrSelectMediaDest();
        if (!dest) return;

        setIsRecording(true);
        setError(null);
        try {
            await RecordScreen(deviceId, dest);
            alert("Screen record saved successfully to " + dest);
        } catch (err) {
            setError("Failed to record screen: " + err);
        } finally {
            setIsRecording(false);
        }
    };

    return (
        <div className="file-explorer-container">
            <div className="header">
                <h1>Files: {deviceId}</h1>
                <div className="header-actions">
                    <button className="refresh-btn capture-btn" onClick={handleCaptureScreen} disabled={isCapturing || isRecording}>
                        {isCapturing ? "Capturing..." : "📷 Screen Cap"}
                    </button>
                    <button className={`refresh-btn record-btn ${isRecording ? 'recording' : ''}`} onClick={handleToggleRecording} disabled={isCapturing}>
                        {isRecording ? "⏹ Stop Recording" : "🎥 Record Screen"}
                    </button>
                    <button className="refresh-btn" onClick={onBack}>
                        <BackIcon />
                        Back
                    </button>
                </div>
            </div>

            <div className="content">
                {error && <div className="error-card">{error}</div>}
                
                <div className="path-bar">
                    <button 
                        className="icon-btn" 
                        title="Previous Folder" 
                        onClick={handlePrevious} 
                        disabled={history.length === 0}
                    >
                        <PrevIcon />
                    </button>
                    <button 
                        className="icon-btn" 
                        title="Up One Level" 
                        onClick={handleUp} 
                        disabled={currentPath === "/"}
                    >
                        <UpIcon />
                    </button>
                    
                    <input 
                        type="text" 
                        value={currentPath} 
                        onChange={(e) => setCurrentPath(e.target.value)}
                        onKeyDown={handlePathChange}
                        className="path-input"
                        placeholder="/sdcard/"
                    />
                    <button className="go-btn" onClick={handleGo}>
                        Go
                    </button>
                </div>
                
                {selectedFiles.length > 0 && (
                    <div className="action-bar">
                        <span className="selected-count">{selectedFiles.length} item(s) selected</span>
                        <div className="action-buttons">
                            <button className="dest-btn" onClick={handleChangeDest} disabled={isDownloading}>
                                Change Dest
                            </button>
                            <button className="download-btn" onClick={handleDownload} disabled={isDownloading}>
                                {isDownloading ? "Downloading..." : "⬇ Download"}
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="file-list-wrapper">
                    {loading ? (
                        <div className="loading-state">Loading files...</div>
                    ) : (
                        <table className="file-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-cell">
                                        <input 
                                            type="checkbox" 
                                            onChange={toggleSelectAll} 
                                            checked={selectedFiles.length === files.length && files.length > 0} 
                                        />
                                    </th>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Modified</th>
                                    <th>Permissions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file, idx) => (
                                    <tr key={idx} className={`file-row ${file.isDir ? 'is-dir' : ''} ${selectedFiles.includes(file.name) ? 'selected' : ''}`} onClick={() => handleFileClick(file)}>
                                        <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedFiles.includes(file.name)} 
                                                onChange={(e) => toggleSelectFile(e, file.name)} 
                                            />
                                        </td>
                                        <td className="file-icon-cell">
                                            {file.isDir ? <FolderIcon /> : <FileIcon />}
                                        </td>
                                        <td className="file-name">{file.name}</td>
                                        <td className="file-size">{file.size}</td>
                                        <td className="file-modified">{file.modified}</td>
                                        <td className="file-mode">{file.mode}</td>
                                    </tr>
                                ))}
                                {files.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="empty-folder">Directory is empty</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
