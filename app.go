package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Device represents an ADB device
type Device struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := ExtractADB(); err != nil {
		fmt.Printf("Warning: failed to extract adb: %v\n", err)
		// It will fallback to system "adb"
	}
}

// GetAdbDevices returns a list of connected ADB devices
func (a *App) GetAdbDevices() []Device {
	cmd := exec.Command(adbPath, "devices")
	out, err := cmd.Output()
	if err != nil {
		return []Device{}
	}

	return parseAdbDevices(string(out))
}

func parseAdbDevices(out string) []Device {
	lines := strings.Split(out, "\n")
	var devices []Device

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "List of") || strings.HasPrefix(line, "* daemon") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 2 {
			devices = append(devices, Device{
				ID:     parts[0],
				Status: parts[1],
			})
		}
	}

	return devices
}

// FileItem represents a file or directory on the Android device
type FileItem struct {
	Name     string `json:"name"`
	IsDir    bool   `json:"isDir"`
	Size     string `json:"size"`
	Mode     string `json:"mode"`
	Modified string `json:"modified"`
}

// ListFiles executes `adb shell ls -la` and parses the output
func (a *App) ListFiles(deviceID string, path string) []FileItem {
	if path == "" {
		path = "/sdcard/"
	}

	cmd := exec.Command(adbPath, "-s", deviceID, "shell", "ls", "-la", path)
	out, err := cmd.Output()
	if err != nil {
		return []FileItem{} // Return empty list on error
	}

	return parseLSA(string(out))
}

func parseLSA(out string) []FileItem {
	lines := strings.Split(out, "\n")
	var files []FileItem

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "total ") {
			continue
		}

		parts := strings.Fields(line)
		// Usually ls -la output has 8 or more fields:
		// drwxrwx--x 3 root sdcard_rw 4096 2023-10-10 10:10 folder name
		// 0          1 2    3         4    5          6     7+
		if len(parts) >= 8 {
			isDir := strings.HasPrefix(parts[0], "d") || strings.HasPrefix(parts[0], "l")
			size := parts[4]
			date := parts[5]
			timeStr := parts[6]
			name := strings.Join(parts[7:], " ")
			
			// Skip current directory reference to declutter
			if name == "." {
			    continue
			}

			files = append(files, FileItem{
				Name:     name,
				IsDir:    isDir,
				Size:     size,
				Mode:     parts[0],
				Modified: date + " " + timeStr,
			})
		}
	}

	return files
}

// SelectDirectory opens a native dialog to choose a folder and returns the selected path
func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Download Destination",
		CanCreateDirectories: true,
	})
}

// DownloadFiles pulls the specified remote paths from the device to the local destination
func (a *App) DownloadFiles(deviceID string, remotePaths []string, destDir string) error {
	for _, remotePath := range remotePaths {
		cmd := exec.Command(adbPath, "-s", deviceID, "pull", remotePath, destDir)
		err := cmd.Run()
		if err != nil {
			return fmt.Errorf("failed to pull %s: %v", remotePath, err)
		}
	}
	return nil
}

// CaptureScreen captures the screen of the device and saves it to a local file
func (a *App) CaptureScreen(deviceID string, destDir string) error {
	fileName := fmt.Sprintf("screencap_%d.png", time.Now().Unix())
	destPath := filepath.Join(destDir, fileName)

	// Since we are capturing raw bytes, we can use exec-out
	cmd := exec.Command(adbPath, "-s", deviceID, "exec-out", "screencap", "-p")
	
	outFile, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %v", err)
	}
	defer outFile.Close()

	cmd.Stdout = outFile
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to capture screen: %v", err)
	}
	return nil
}

// RecordScreen starts recording the device screen and saves it locally
func (a *App) RecordScreen(deviceID string, destDir string) error {
	fileName := fmt.Sprintf("screenrecord_%d.mp4", time.Now().Unix())
	deviceTempPath := "/data/local/tmp/temp_record.mp4"
	localDestPath := filepath.Join(destDir, fileName)

	// Run with max 30s limit
	cmd := exec.Command(adbPath, "-s", deviceID, "shell", "screenrecord", "--time-limit", "30", deviceTempPath)
	_ = cmd.Run() // Blocks until 30s limit is reached or the process is stopped

	// We still attempt to pull the file even if there is an error (e.g. from early stop)
	pullCmd := exec.Command(adbPath, "-s", deviceID, "pull", deviceTempPath, localDestPath)
	pullErr := pullCmd.Run()

	// Clean up temp file on device
	exec.Command(adbPath, "-s", deviceID, "shell", "rm", deviceTempPath).Run()

	if pullErr != nil {
		return fmt.Errorf("failed to pull screen record: %v", pullErr)
	}
	return nil
}

// StopScreenRecord cleanly stops any running screen record
func (a *App) StopScreenRecord(deviceID string) error {
	cmd := exec.Command(adbPath, "-s", deviceID, "shell", "pkill", "-INT", "screenrecord")
	return cmd.Run()
}

// ConnectWifi sets the device to tcpip mode and connects to it over WiFi
func (a *App) ConnectWifi(deviceID string) (string, error) {
	// 1. Get the IP first
	cmd := exec.Command(adbPath, "-s", deviceID, "shell", "ip", "addr", "show", "wlan0")
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get wlan0 IP (is wifi on?): %v", err)
	}

	var ip string
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "inet ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				ip = strings.Split(parts[1], "/")[0]
				break
			}
		}
	}

	if ip == "" {
		return "", fmt.Errorf("could not parse wifi ip address for device")
	}

	// 2. Set tcpip mode
	cmd = exec.Command(adbPath, "-s", deviceID, "tcpip", "5555")
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to set tcpip mode: %v", err)
	}

	// Give the daemon a moment to restart
	time.Sleep(2 * time.Second)

	// 3. Connect via tcpip
	cmd = exec.Command(adbPath, "connect", fmt.Sprintf("%s:5555", ip))
	connectOut, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to connect to %s: %s", ip, string(connectOut))
	}

	return ip, nil
}
