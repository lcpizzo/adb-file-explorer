import { useState, useEffect } from 'react';
import { GetAdbDevices } from "../../wailsjs/go/main/App";
import { PhoneIcon, PlugIcon, SpinnerIcon, FileIcon } from './Icons';

export default function DeviceList({ onSelectDevice, currentDevice }) {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchDevices = async () => {
        setLoading(true);
        setError(null);
        try {
            const tempDevices = await GetAdbDevices();
            setDevices(tempDevices || []);
        } catch (err) {
            setError("Failed to fetch devices: " + err.toString());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    // Also export a small refresh button to plug into the header
    // But since the header is shared in App.jsx, we can just handle the UI entirely inside DeviceList 
    // or rely on a standard layout. We'll include the header in App.jsx and pass fetch down or build it mostly self-contained.
    
    return (
        <div className="device-list-container">
            <div className="header">
                <h1>ADB Connected Devices</h1>
                <button className="refresh-btn" onClick={fetchDevices} disabled={loading}>
                    {loading && <SpinnerIcon />}
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>
            
            <div className="content">
                {error && <div className="error-card">{error}</div>}
                {!error && devices.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-icon"><PlugIcon /></div>
                        <p>No devices connected</p>
                        <p className="empty-hint">Try connecting a device or starting an emulator</p>
                    </div>
                )}

                <div className="device-grid">
                    {devices.map((device) => (
                        <div key={device.id} className="device-card" onClick={() => onSelectDevice(device.id)} style={{cursor: 'pointer'}}>
                            <div className="device-icon">
                                <PhoneIcon />
                            </div>
                            <div className="device-info">
                                <h3 className="device-id" title={device.id}>{device.id}</h3>
                                <span className={`status-badge status-${device.status.toLowerCase()}`}>
                                    {device.status}
                                </span>
                            </div>
                            <div className="device-actions">
                                <button className="action-btn" title="Browse Files">
                                    <FileIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
