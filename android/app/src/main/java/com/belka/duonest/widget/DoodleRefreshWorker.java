package com.belka.duonest.widget;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/** Retry fallback if an immediate widget fetch fails while offline. */
public final class DoodleRefreshWorker extends Worker {
    private static final String WORK_NAME = "duonest_doodle_widget_refresh";

    public DoodleRefreshWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    static void enqueue(Context context) {
        OneTimeWorkRequest.Builder request = new OneTimeWorkRequest.Builder(DoodleRefreshWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build());
        if (android.os.Build.VERSION.SDK_INT >= 31) {
            request.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
        }
        WorkManager.getInstance(context).enqueueUniqueWork(
            WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            request.build()
        );
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        boolean refreshed = DoodleWidgetSync.refresh(context);
        DoodleWidgetProvider.requestRender(context);
        if (refreshed) return Result.success();
        return getRunAttemptCount() < 4 ? Result.retry() : Result.failure();
    }
}
