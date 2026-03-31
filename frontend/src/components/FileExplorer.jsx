import { useState, useEffect } from 'react';
import { ListFiles } from "../../wailsjs/go/main/App";
import { FolderIcon, FileIcon, BackIcon, UpIcon, PrevIcon } from './Icons';

export default function FileExplorer({ deviceId, onBack }) {
    const [currentPath, setCurrentPath] = useState("/sdcard/");
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchFiles = async (targetPath) => {
        setLoading(true);
        setError(null);
        try {
            const tempFiles = await ListFiles(deviceId, targetPath);
            setFiles(tempFiles || []);
            setCurrentPath(targetPath);
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

    return (
        <div className="file-explorer-container">
            <div className="header">
                <h1>Files: {deviceId}</h1>
                <button className="refresh-btn" onClick={onBack}>
                    <BackIcon />
                    Back
                </button>
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
                
                <div className="file-list-wrapper">
                    {loading ? (
                        <div className="loading-state">Loading files...</div>
                    ) : (
                        <table className="file-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Modified</th>
                                    <th>Permissions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file, idx) => (
                                    <tr key={idx} className={`file-row ${file.isDir ? 'is-dir' : ''}`} onClick={() => handleFileClick(file)}>
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
                                        <td colSpan="5" className="empty-folder">Directory is empty</td>
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
