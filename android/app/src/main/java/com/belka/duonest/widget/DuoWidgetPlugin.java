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
        if (session == null && call.getString("uid") != null) {
            call.reject("Incomplete widget session");
            return;
        }
        store.setAppSession(session, call.getString("partnerName", ""));
        DoodleWidgetProvider.requestRender(getContext());
        PartnerLocationWidgetProvider.render(getContext());
        if (session != null) PartnerLocationRefreshWorker.enqueue(getContext());
        call.resolve();
    }

    @PluginMethod
    public void hasReadAccess(PluginCall call) {
        JSObject result = new JSObject();
        result.put("valid", DoodleWidgetStore.get(getContext()).hasLocationAccess(
            call.getString("uid", ""), call.getString("partnershipId", "")));
        call.resolve(result);
    }

    @PluginMethod
    public void refreshLocation(PluginCall call) {
        PartnerLocationRefreshWorker.enqueue(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setDoodle(PluginCall call) {
        JSObject doodle = call.getObject("doodle", null);
        DoodleWidgetStore store = DoodleWidgetStore.get(getContext());
        if (doodle == null) {
            if (Boolean.TRUE.equals(call.getBoolean("verifyEmpty", false))) {
                // Initial hydration may not have loaded the drawing yet; confirm on the server first.
                if (!store.currentDoodleKey().isEmpty()) DoodleWidgetSync.refreshAsync(getContext(), null);
                call.resolve();
                return;
            }
            store.setDoodle(null);
            store.finishPartnerDrawing();
            DoodleWidgetProvider.cancelDrawingExpiry(getContext());
            DoodleWidgetProvider.requestRender(getContext());
            call.resolve();
            return;
        }
        boolean changed = store.setDoodle(doodle);
        if (changed && Boolean.TRUE.equals(call.getBoolean("finishDrawing", false))) {
            store.finishPartnerDrawing();
            DoodleWidgetProvider.cancelDrawingExpiry(getContext());
        }
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
        DoodleWidgetStore store = DoodleWidgetStore.get(getContext());
        store.addLiveStroke(stroke);
        long now = System.currentTimeMillis();
        long targetUntil = now + LIVE_DRAWING_MS;
        if (store.partnerDrawingUntil() < now + LIVE_DRAWING_MS / 2) {
            store.setPartnerDrawingUntil(Math.max(store.partnerDrawingUntil(), targetUntil));
            DoodleWidgetProvider.scheduleDrawingExpiry(getContext(), LIVE_DRAWING_MS);
        }
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
        DoodleWidgetStore store = DoodleWidgetStore.get(getContext());
        if (isDrawing) {
            long until = Math.max(store.partnerDrawingUntil(), System.currentTimeMillis() + LIVE_DRAWING_MS);
            store.setPartnerDrawingUntil(until);
            DoodleWidgetProvider.scheduleDrawingExpiry(getContext(), Math.max(LIVE_DRAWING_MS, until - System.currentTimeMillis()));
        } else {
            store.setPartnerDrawingUntil(0);
            DoodleWidgetProvider.cancelDrawingExpiry(getContext());
        }
        DoodleWidgetProvider.requestRender(getContext());
        call.resolve();
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        DoodleWidgetProvider.restore(getContext());
        PartnerLocationWidgetProvider.restore(getContext());
        PartnerLocationRefreshWorker.enqueue(getContext());
        DoodleWidgetSync.refreshAsync(getContext(), call::resolve);
    }
}
