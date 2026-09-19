package com.rsknet.warungpos;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class AndroidBridge {
    private final Activity activity;

    public AndroidBridge(Activity activity) {
        this.activity = activity;
    }

    private String getRootFolder() {
        return activity.getPackageName().endsWith(".dev") ? "WarungPOS-Dev" : "WarungPOS";
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

    // Backward compatibility for existing backup calls
    @JavascriptInterface
    public boolean saveToDownloads(String content, String filename) {
        return saveToFolder(content, filename, "Backup", "application/octet-stream");
    }

    private void showToast(final String message) {
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
    }
}
