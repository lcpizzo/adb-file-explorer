package main

import (
	"context"
	"os/exec"
	"strings"
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
