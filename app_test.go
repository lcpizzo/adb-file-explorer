package main

import (
	"reflect"
	"testing"
)

func TestParseAdbDevices(t *testing.T) {
	input := `List of devices attached
emulator-5554   device
1234567890      offline
* daemon not running; starting now at tcp:5037
* daemon started successfully

`
	expected := []Device{
		{ID: "emulator-5554", Status: "device"},
		{ID: "1234567890", Status: "offline"},
	}

	result := parseAdbDevices(input)

	if !reflect.DeepEqual(result, expected) {
		t.Errorf("Expected %+v, got %+v", expected, result)
	}
}

func TestParseLSA(t *testing.T) {
	input := `total 12
drwxrwx--x 2 root sdcard_rw 4096 2021-01-01 12:00 Alarms
-rw-rw---- 1 root sdcard_rw 1024 2021-01-01 12:00 file.txt
drwxrwx--x 3 root sdcard_rw 4096 2021-01-01 12:00 Android folder
`
	expected := []FileItem{
		{Name: "Alarms", IsDir: true, Size: "4096", Mode: "drwxrwx--x", Modified: "2021-01-01 12:00"},
		{Name: "file.txt", IsDir: false, Size: "1024", Mode: "-rw-rw----", Modified: "2021-01-01 12:00"},
		{Name: "Android folder", IsDir: true, Size: "4096", Mode: "drwxrwx--x", Modified: "2021-01-01 12:00"}, // Space in name test
	}

	result := parseLSA(input)

	if !reflect.DeepEqual(result, expected) {
		t.Errorf("Expected %+v, got %+v", expected, result)
	}
}
