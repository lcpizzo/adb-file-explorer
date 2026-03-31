import { useState, useEffect } from 'react';
import './App.css';
import { GetAdbDevices } from "../wailsjs/go/main/App";

function App() {
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

    return (
        <div id="App">
            <header className="header">
                <h1>ADB Connected Devices</h1>
                <button className="refresh-btn" onClick={fetchDevices} disabled={loading}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className={loading ? "spin" : ""}>
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                    </svg>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </header>

            <main className="content">
                {error && <div className="error-card">{error}</div>}
                
                {!error && devices.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-icon">🔌</div>
                        <p>No devices connected</p>
                        <p className="empty-hint">Try connecting a device or starting an emulator</p>
                    </div>
                )}

                <div className="device-grid">
                    {devices.map((device) => (
                        <div key={device.id} className="device-card">
                            <div className="device-icon">
                                {device.id.includes("emulator") ? "📳" : "📱"}
                            </div>
                            <div className="device-info">
                                <h3 className="device-id" title={device.id}>{device.id}</h3>
                                <span className={`status-badge status-${device.status.toLowerCase()}`}>
                                    {device.status}
                                </span>
                            </div>
                            <div className="device-actions">
                                <button className="action-btn" title="Coming soon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default App;
