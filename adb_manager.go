package main

import (
	"embed"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
)

//go:embed bin/*
var adbBinaries embed.FS

var adbPath = "adb" // Default to system adb

// ExtractADB extracts the appropriate ADB binary for the current OS
func ExtractADB() error {
	tempDir := os.TempDir()
	appDir := filepath.Join(tempDir, "adb-file-explorer")

	if err := os.MkdirAll(appDir, 0755); err != nil {
		return fmt.Errorf("failed to create temp app dir: %v", err)
	}

	switch runtime.GOOS {
	case "windows":
		filesToExtract := []string{"adb.exe", "AdbWinApi.dll", "AdbWinUsbApi.dll"}
		for _, file := range filesToExtract {
			err := extractFile("bin/windows/"+file, filepath.Join(appDir, file), false)
			if err != nil {
				return err
			}
		}
		adbPath = filepath.Join(appDir, "adb.exe")
	case "linux":
		err := extractFile("bin/linux/adb", filepath.Join(appDir, "adb"), true)
		if err != nil {
			return err
		}
		adbPath = filepath.Join(appDir, "adb")
	default:
		// Fallback to system adb for MacOS or unknown OS
		adbPath = "adb"
	}

	return nil
}

func extractFile(embedPath, targetPath string, isExecutable bool) error {
	// Check if already extracted
	if _, err := os.Stat(targetPath); err == nil {
		return nil // File already exists
	}

	fileContent, err := adbBinaries.Open(embedPath)
	if err != nil {
		return fmt.Errorf("failed to open embedded file %s: %v", embedPath, err)
	}
	defer fileContent.Close()

	out, err := os.Create(targetPath)
	if err != nil {
		return fmt.Errorf("failed to create target file %s: %v", targetPath, err)
	}
	defer out.Close()

	if _, err := io.Copy(out, fileContent); err != nil {
		return fmt.Errorf("failed to write target file %s: %v", targetPath, err)
	}

	if isExecutable {
		if err := os.Chmod(targetPath, 0755); err != nil {
			return fmt.Errorf("failed to set executable permission on %s: %v", targetPath, err)
		}
	}

	return nil
}
