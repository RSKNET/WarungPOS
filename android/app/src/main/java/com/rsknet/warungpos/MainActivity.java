package com.rsknet.warungpos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    public static final int CAMERA_PERMISSION_REQUEST_CODE = 101;
    public static final int BLUETOOTH_PERMISSION_REQUEST_CODE = 102;
    public static final int REQUEST_ENABLE_BT_CODE = 103;
    private PermissionRequest pendingCameraPermissionRequest;

    private final BroadcastReceiver bluetoothReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(action)) {
                int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                if (state == BluetoothAdapter.STATE_ON) {
                    runOnUiThread(() -> {
                        getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new CustomEvent('bluetoothStateChanged', { detail: { enabled: true } }));", null);
                    });
                } else if (state == BluetoothAdapter.STATE_OFF) {
                    runOnUiThread(() -> {
                        getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new CustomEvent('bluetoothStateChanged', { detail: { enabled: false } }));", null);
                    });
                }
            }
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        getWindow().setStatusBarColor(Color.BLACK);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
        }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(0, insets.top, 0, 0);
            return windowInsets;
        });

        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean needsCamera = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            needsCamera = true;
                            break;
                        }
                    }

                    if (needsCamera && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        pendingCameraPermissionRequest = request;
                        ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST_CODE);
                    } else {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        IntentFilter filter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
        ContextCompat.registerReceiver(this, bluetoothReceiver, filter, ContextCompat.RECEIVER_EXPORTED);

        getBridge().getWebView().addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
    }

    @Override
    public void onDestroy() {
        try {
            unregisterReceiver(bluetoothReceiver);
        } catch (Exception ignored) {
        }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_ENABLE_BT_CODE) {
            boolean enabled = (resultCode == RESULT_OK);
            runOnUiThread(() -> {
                getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new CustomEvent('bluetoothStateChanged', { detail: { enabled: " + enabled + " } }));", null);
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingCameraPermissionRequest != null) {
                    pendingCameraPermissionRequest.grant(pendingCameraPermissionRequest.getResources());
                }
            } else {
                if (pendingCameraPermissionRequest != null) {
                    pendingCameraPermissionRequest.deny();
                }
            }
            pendingCameraPermissionRequest = null;
        } else if (requestCode == BLUETOOTH_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> {
                    getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new CustomEvent('bluetoothPermissionGranted'));", null);
                });
            }
        }
    }
}
