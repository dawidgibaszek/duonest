package com.belka.duonest.widget;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.concurrent.TimeUnit;

/** Retry fallback if an immediate widget fetch fails while offline. */
public final class DoodleRefreshWorker extends Worker {
    private static final String WORK_NAME = "duonest_doodle_widget_refresh";
    private static final String PERIODIC_WORK_NAME = "duonest_doodle_widget_periodic";

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

    static void schedulePeriodic(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(DoodleRefreshWorker.class, 30, TimeUnit.MINUTES)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC_WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    static void cancelPeriodic(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC_WORK_NAME);
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
