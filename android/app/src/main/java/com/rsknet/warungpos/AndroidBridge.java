package com.rsknet.warungpos;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.content.FileProvider;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

public class AndroidBridge {
    private final Activity activity;

    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private BluetoothSocket bluetoothSocket = null;
    private OutputStream bluetoothOutputStream = null;
    private String connectedMac = "";

    public AndroidBridge(Activity activity) {
        this.activity = activity;
    }

    private String getRootFolder() {
        return "WarungPOS";
    }

    @JavascriptInterface
    public String getPairedPrinters(final boolean showAll) {
        JSONArray result = new JSONArray();
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null || !adapter.isEnabled()) {
                return result.toString();
            }

            Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
            if (pairedDevices == null || pairedDevices.isEmpty()) {
                return result.toString();
            }

            for (BluetoothDevice device : pairedDevices) {
                String name = device.getName() != null ? device.getName() : "Unknown Device";
                String mac = device.getAddress();
                BluetoothClass btClass = device.getBluetoothClass();
                int majorClass = btClass != null ? btClass.getMajorDeviceClass() : 0;
                int fullClass = btClass != null ? btClass.getDeviceClass() : 0;

                boolean isAudio = (majorClass == BluetoothClass.Device.Major.AUDIO_VIDEO);
                boolean isPhone = (majorClass == BluetoothClass.Device.Major.PHONE);
                boolean isWearable = (majorClass == BluetoothClass.Device.Major.WEARABLE);

                String lower = name.toLowerCase();
                boolean hasAudioKeyword = lower.contains("tws") || lower.contains("earbud") ||
                                          lower.contains("airpod") || lower.contains("headset") ||
                                          lower.contains("headphone") || lower.contains("speaker") ||
                                          lower.contains("sound") || lower.contains("jbl") ||
                                          lower.contains("buds") || lower.contains("wireless");

                if (!showAll && (isAudio || isPhone || isWearable || hasAudioKeyword)) {
                    continue;
                }

                boolean isImaging = (majorClass == BluetoothClass.Device.Major.IMAGING);
                boolean hasPrinterKeyword = lower.contains("pos") || lower.contains("print") ||
                                            lower.contains("thermal") || lower.contains("rpp") ||
                                            lower.contains("mpt") || lower.contains("mtp") ||
                                            lower.contains("zj") || lower.contains("58") ||
                                            lower.contains("80") || lower.contains("panda") ||
                                            lower.contains("vsc") || lower.contains("goojprt") ||
                                            lower.contains("ep-") || lower.contains("xp-") ||
                                            lower.contains("bt-") || lower.contains("pt-") ||
                                            lower.contains("iware");

                boolean isPrinter = isImaging || hasPrinterKeyword;

                if (!showAll && !isPrinter && majorClass != 0 && majorClass != 0x1F00) {
                    continue;
                }

                JSONObject obj = new JSONObject();
                obj.put("name", name);
                obj.put("mac", mac);
                obj.put("isPrinter", isPrinter);
                obj.put("deviceClass", fullClass);
                result.put(obj);
            }
        } catch (Exception ignored) {
        }
        return result.toString();
    }

    @JavascriptInterface
    public boolean connectPrinter(final String mac) {
        if (mac == null || mac.isEmpty()) return false;
        try {
            if (bluetoothSocket != null && mac.equalsIgnoreCase(connectedMac) && bluetoothSocket.isConnected()) {
                return true;
            }
            disconnectPrinter();

            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null || !adapter.isEnabled()) {
                showToast("Bluetooth tidak aktif");
                return false;
            }

            BluetoothDevice device = adapter.getRemoteDevice(mac);
            bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            adapter.cancelDiscovery();
            bluetoothSocket.connect();
            bluetoothOutputStream = bluetoothSocket.getOutputStream();
            connectedMac = mac;
            showToast("Printer terhubung:\n" + (device.getName() != null ? device.getName() : mac));
            return true;
        } catch (Exception e) {
            disconnectPrinter();
            showToast("Gagal menghubungkan printer: " + e.getMessage());
            return false;
        }
    }

    @JavascriptInterface
    public boolean disconnectPrinter() {
        try {
            if (bluetoothOutputStream != null) {
                bluetoothOutputStream.close();
                bluetoothOutputStream = null;
            }
            if (bluetoothSocket != null) {
                bluetoothSocket.close();
                bluetoothSocket = null;
            }
        } catch (Exception ignored) {}
        connectedMac = "";
        return true;
    }

    @JavascriptInterface
    public boolean isPrinterConnected() {
        return bluetoothSocket != null && bluetoothSocket.isConnected() && bluetoothOutputStream != null;
    }

    @JavascriptInterface
    public String getConnectedPrinterMac() {
        return isPrinterConnected() ? connectedMac : "";
    }

    @JavascriptInterface
    public boolean printBluetoothImage(final String base64Data, final int paperWidthMm) {
        if (!isPrinterConnected()) {
            showToast("Printer Bluetooth belum terhubung");
            return false;
        }

        try {
            String cleanBase64 = base64Data;
            if (cleanBase64.contains(",")) {
                cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
            }
            byte[] imgBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
            Bitmap bmp = BitmapFactory.decodeByteArray(imgBytes, 0, imgBytes.length);
            if (bmp == null) return false;

            int targetWidth = (paperWidthMm >= 80) ? 576 : 384;
            byte[] escPosData = convertBitmapToEscPos(bmp, targetWidth);

            bluetoothOutputStream.write(new byte[]{0x1B, 0x40});
            bluetoothOutputStream.write(new byte[]{0x1B, 0x61, 0x01});
            bluetoothOutputStream.write(escPosData);
            bluetoothOutputStream.write(new byte[]{0x1B, 0x64, 0x03});
            bluetoothOutputStream.flush();
            return true;
        } catch (Exception e) {
            showToast("Gagal mencetak: " + e.getMessage());
            return false;
        }
    }

    private byte[] convertBitmapToEscPos(Bitmap sourceBitmap, int targetWidth) {
        int width = (targetWidth + 7) / 8 * 8;
        int height = Math.round((float) sourceBitmap.getHeight() * ((float) width / (float) sourceBitmap.getWidth()));
        Bitmap bitmap = Bitmap.createScaledBitmap(sourceBitmap, width, height, true);

        byte[] rasterData = new byte[(width / 8) * height];
        int idx = 0;

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x += 8) {
                byte b = 0;
                for (int bit = 0; bit < 8; bit++) {
                    int px = x + bit;
                    if (px < bitmap.getWidth()) {
                        int pixel = bitmap.getPixel(px, y);
                        int r = (pixel >> 16) & 0xff;
                        int g = (pixel >> 8) & 0xff;
                        int bl = pixel & 0xff;
                        int luminance = (r * 299 + g * 587 + bl * 114) / 1000;
                        if (luminance < 165) {
                            b |= (1 << (7 - bit));
                        }
                    }
                }
                rasterData[idx++] = b;
            }
        }

        int xL = (width / 8) % 256;
        int xH = (width / 8) / 256;
        int yL = height % 256;
        int yH = height / 256;

        byte[] header = new byte[]{0x1D, 0x76, 0x30, 0x00, (byte) xL, (byte) xH, (byte) yL, (byte) yH};
        byte[] fullCmd = new byte[header.length + rasterData.length];
        System.arraycopy(header, 0, fullCmd, 0, header.length);
        System.arraycopy(rasterData, 0, fullCmd, header.length, rasterData.length);
        return fullCmd;
    }

    @JavascriptInterface
    public boolean saveToFolder(String content, String filename, String subFolder, String mimeType) {
        try {
            String rootFolder = getRootFolder();
            String folderName = (subFolder != null && !subFolder.isEmpty()) ? subFolder : "General";
            String relativePath = Environment.DIRECTORY_DOWNLOADS + "/" + rootFolder + "/" + folderName;
            String type = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, type);
                values.put(MediaStore.Downloads.RELATIVE_PATH, relativePath);

                Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream os = activity.getContentResolver().openOutputStream(uri)) {
                        if (os != null) {
                            os.write(content.getBytes(StandardCharsets.UTF_8));
                            os.flush();
                            showToast("Tersimpan di Download/" + rootFolder + "/" + folderName + "/\n" + filename);
                            return true;
                        }
                    }
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), rootFolder + "/" + folderName);
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File file = new File(dir, filename);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(content.getBytes(StandardCharsets.UTF_8));
                    fos.flush();
                    showToast("Tersimpan di Download/" + rootFolder + "/" + folderName + "/\n" + filename);
                    return true;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    @JavascriptInterface
    public boolean saveBase64Image(String base64Data, String filename, String subFolder) {
        try {
            String rootFolder = getRootFolder();
            String folderName = (subFolder != null && !subFolder.isEmpty()) ? subFolder : "Image";
            String relativePath = Environment.DIRECTORY_DOWNLOADS + "/" + rootFolder + "/" + folderName;

            // Strip data:image/...;base64, prefix if present
            String cleanBase64 = base64Data;
            if (cleanBase64.contains(",")) {
                cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
            }
            byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, "image/png");
                values.put(MediaStore.Downloads.RELATIVE_PATH, relativePath);

                Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream os = activity.getContentResolver().openOutputStream(uri)) {
                        if (os != null) {
                            os.write(imageBytes);
                            os.flush();
                            showToast("Gambar tersimpan di Download/" + rootFolder + "/" + folderName + "/\n" + filename);
                            return true;
                        }
                    }
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), rootFolder + "/" + folderName);
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File file = new File(dir, filename);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(imageBytes);
                    fos.flush();
                    MediaScannerConnection.scanFile(activity, new String[]{file.getAbsolutePath()}, new String[]{"image/png"}, null);
                    showToast("Gambar tersimpan di Download/" + rootFolder + "/" + folderName + "/\n" + filename);
                    return true;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    @JavascriptInterface
    public boolean shareImage(String base64Data, String title) {
        try {
            String cleanBase64 = base64Data;
            if (cleanBase64.contains(",")) {
                cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
            }
            byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

            File cachePath = new File(activity.getCacheDir(), "images");
            if (!cachePath.exists()) {
                cachePath.mkdirs();
            }

            File receiptFile = new File(cachePath, "struk_" + System.currentTimeMillis() + ".png");
            try (FileOutputStream fos = new FileOutputStream(receiptFile)) {
                fos.write(imageBytes);
                fos.flush();
            }

            Uri contentUri = FileProvider.getUriForFile(
                activity,
                activity.getPackageName() + ".fileprovider",
                receiptFile
            );

            if (contentUri != null) {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                shareIntent.setType("image/png");
                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);

                String chooserTitle = (title != null && !title.isEmpty()) ? title : "Bagikan Struk Transaksi";
                activity.startActivity(Intent.createChooser(shareIntent, chooserTitle));
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    @JavascriptInterface
    public void printHtml(final String htmlContent, final String jobName) {
        activity.runOnUiThread(() -> {
            try {
                WebView printWebView = new WebView(activity);
                printWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        try {
                            PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                            if (printManager != null) {
                                String title = (jobName != null && !jobName.isEmpty()) ? jobName : "WarungPOS Document";
                                PrintDocumentAdapter printAdapter = printWebView.createPrintDocumentAdapter(title);
                                printManager.print(title, printAdapter, new PrintAttributes.Builder().build());
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                });
                printWebView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    @JavascriptInterface
    public boolean saveToDownloads(String content, String filename) {
        return saveToFolder(content, filename, "Backup", "application/octet-stream");
    }

    private void showToast(final String message) {
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
    }
}
