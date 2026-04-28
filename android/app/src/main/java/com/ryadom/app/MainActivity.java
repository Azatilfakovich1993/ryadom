package com.ryadom.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.view.inputmethod.EditorInfo;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setInputType(EditorInfo.TYPE_CLASS_TEXT);
        }
    }
}
