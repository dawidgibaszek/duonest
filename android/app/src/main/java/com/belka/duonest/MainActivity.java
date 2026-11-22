package com.belka.duonest;

import android.os.Bundle;
import com.belka.duonest.widget.DuoWidgetPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DuoWidgetPlugin.class);
        registerPlugin(DuoLocationPlugin.class);
        registerPlugin(DuoAndroidDiagnosticsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
