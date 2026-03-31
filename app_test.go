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
