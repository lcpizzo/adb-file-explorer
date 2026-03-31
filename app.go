package main

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

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
}

// GetAdbDevices returns a list of connected ADB devices
func (a *App) GetAdbDevices() []Device {
	cmd := exec.Command("adb", "devices")
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

	cmd := exec.Command("adb", "-s", deviceID, "shell", "ls", "-la", path)
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
		cmd := exec.Command("adb", "-s", deviceID, "pull", remotePath, destDir)
		err := cmd.Run()
		if err != nil {
			return fmt.Errorf("failed to pull %s: %v", remotePath, err)
		}
	}
	return nil
}
