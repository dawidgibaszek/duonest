package com.belka.duonest.widget;

import androidx.annotation.NonNull;
import com.google.firebase.messaging.RemoteMessage;
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;

/** Replaces the plugin's FCM service so silent widget messages are handled even when the app is closed. */
public class DuoMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        String widget = remoteMessage.getData().get("widget");
        if ("doodle".equals(widget)) {
            DoodleWidgetSync.handlePush(this, remoteMessage.getData());
            return;
        }
        if ("location".equals(widget)) {
            DoodleWidgetStore.Session session = DoodleWidgetStore.get(this).session();
            if (session != null && !session.profileId.isEmpty() &&
                session.profileId.equals(remoteMessage.getData().get("recipientProfileId"))) {
                PartnerLocationRefreshWorker.enqueue(this);
            }
            return;
        }
        super.onMessageReceived(remoteMessage);
    }
}
