package com.belka.duonest.widget;

import androidx.annotation.NonNull;
import com.google.firebase.messaging.RemoteMessage;
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;

/** Replaces the plugin's FCM service so silent widget messages are handled even when the app is closed. */
public class DuoMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        if ("doodle".equals(remoteMessage.getData().get("widget"))) {
            DoodleWidgetSync.handlePush(this, remoteMessage.getData());
            return;
        }
        super.onMessageReceived(remoteMessage);
    }
}
