package br.usp.callefi.revisoes;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {

    private static final String CLAUDE_PACKAGE = "com.anthropic.claude";

    private WebView webView;
    private boolean pageLoaded = false;
    private String pendingSharedText = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);

        webView.addJavascriptInterface(new Bridge(), "Android");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("file".equals(uri.getScheme())) return false;
                openExternal(uri.toString());
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                if (pendingSharedText != null) {
                    deliverSharedText(pendingSharedText);
                    pendingSharedText = null;
                }
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null || text.isEmpty()) return;
        if (pageLoaded) {
            deliverSharedText(text);
        } else {
            pendingSharedText = text;
        }
    }

    private void deliverSharedText(String text) {
        String js = "window.onSharedText && window.onSharedText(" + JSONObject.quote(text) + ")";
        webView.evaluateJavascript(js, null);
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript("window.onBack ? window.onBack() : false", value -> {
            if (!"true".equals(value)) MainActivity.super.onBackPressed();
        });
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException e) {
            toast("Nenhum app abre este link");
        }
    }

    private void toast(String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
    }

    private void copyToClipboard(String label, String text) {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText(label, text));
    }

    private boolean isInstalled(String pkg) {
        try {
            getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /** Métodos chamados pelo JavaScript da página (window.Android.*). */
    private class Bridge {

        /**
         * Copia o prompt e abre o app do Claude já instalado.
         * Tenta primeiro o "Compartilhar" direto para o Claude (prompt já preenchido);
         * se o app não aceitar, apenas abre o Claude e o usuário cola o prompt.
         */
        @JavascriptInterface
        public String openClaude(String prompt) {
            copyToClipboard("Prompt Revisões", prompt);

            if (!isInstalled(CLAUDE_PACKAGE)) {
                openExternal("market://details?id=" + CLAUDE_PACKAGE);
                return "not_installed";
            }

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, prompt);
            send.setPackage(CLAUDE_PACKAGE);
            try {
                startActivity(send);
                return "shared";
            } catch (ActivityNotFoundException e) {
                Intent launch = getPackageManager().getLaunchIntentForPackage(CLAUDE_PACKAGE);
                if (launch != null) {
                    startActivity(launch);
                    toast("Prompt copiado. Cole no Claude.");
                    return "launched";
                }
                return "failed";
            }
        }

        @JavascriptInterface
        public String readClipboard() {
            final String[] out = {""};
            final CountDownLatch latch = new CountDownLatch(1);
            runOnUiThread(() -> {
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm.hasPrimaryClip() && cm.getPrimaryClip().getItemCount() > 0) {
                        CharSequence t = cm.getPrimaryClip().getItemAt(0).coerceToText(MainActivity.this);
                        if (t != null) out[0] = t.toString();
                    }
                } finally {
                    latch.countDown();
                }
            });
            try {
                latch.await(2, TimeUnit.SECONDS);
            } catch (InterruptedException ignored) {
            }
            return out[0];
        }

        @JavascriptInterface
        public void copyText(String text) {
            copyToClipboard("Revisões", text);
            toast("Copiado");
        }

        @JavascriptInterface
        public void openUrl(String url) {
            openExternal(url);
        }

        @JavascriptInterface
        public void shareText(String text, String subject) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, subject);
            send.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(send, subject));
        }
    }
}
