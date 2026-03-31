import { useState } from 'react';
import './App.css';
import DeviceList from './components/DeviceList';
import FileExplorer from './components/FileExplorer';

function App() {
    const [selectedDevice, setSelectedDevice] = useState(null);

    return (
        <div id="App">
            {!selectedDevice ? (
                <DeviceList onSelectDevice={setSelectedDevice} />
            ) : (
                <FileExplorer deviceId={selectedDevice} onBack={() => setSelectedDevice(null)} />
            )}
        </div>
    );
}

export default App;
