package com.belka.duonest.widget;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Bridge for plugins/native-widget.client.ts: the running app streams doodle state to the widget. */
@CapacitorPlugin(name = "DuoWidget")
public class DuoWidgetPlugin extends Plugin {

    // Matches the 3.5 s drawing timeout in useRealtimeSync.ts, with slack for a killed process.
    private static final long LIVE_DRAWING_MS = 15_000;

    @PluginMethod
    public void setSession(PluginCall call) {
        DoodleWidgetStore store = DoodleWidgetStore.get(getContext());
        DoodleWidgetStore.Session session = DoodleWidgetStore.Session.fromJson(call.getData());
        store.setSession(session);
        if (session != null) store.setPartnerName(call.getString("partnerName", ""));
        DoodleWidgetProvider.requestRender(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setDoodle(PluginCall call) {
        JSObject doodle = call.getObject("doodle", null);
        DoodleWidgetStore.get(getContext()).setDoodle(doodle);
        DoodleWidgetProvider.requestRender(getContext());
        call.resolve();
    }

    @PluginMethod
    public void addLiveStroke(PluginCall call) {
        DoodleStroke stroke = DoodleStroke.fromJson(call.getObject("stroke", null));
        if (stroke == null) {
            call.reject("Invalid stroke");
            return;
        }
        DoodleWidgetStore.get(getContext()).addLiveStroke(stroke);
        DoodleWidgetProvider.requestRender(getContext());
        call.resolve();
    }

    @PluginMethod
    public void clearLiveStrokes(PluginCall call) {
        DoodleWidgetStore.get(getContext()).clearLiveStrokes();
        DoodleWidgetProvider.requestRender(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setPartnerDrawing(PluginCall call) {
        boolean isDrawing = Boolean.TRUE.equals(call.getBoolean("isDrawing", false));
        DoodleWidgetStore.get(getContext()).setPartnerDrawingUntil(isDrawing ? System.currentTimeMillis() + LIVE_DRAWING_MS : 0);
        if (isDrawing) DoodleWidgetProvider.scheduleDrawingExpiry(getContext(), LIVE_DRAWING_MS);
        DoodleWidgetProvider.requestRender(getContext());
        call.resolve();
    }
}
