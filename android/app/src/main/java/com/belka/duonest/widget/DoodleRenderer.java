package com.belka.duonest.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import java.util.List;

final class DoodleRenderer {

    // Matches utils/duoDoodle.ts. At RGB_565 this stays below the RemoteViews payload limit.
    private static final int WIDTH = 768;
    private static final int HEIGHT = 384;

    private DoodleRenderer() {}

    static Bitmap render(List<DoodleStroke> strokes) {
        Bitmap layer = Bitmap.createBitmap(WIDTH, HEIGHT, Bitmap.Config.ARGB_8888);
        Canvas layerCanvas = new Canvas(layer);
        for (DoodleStroke stroke : strokes) drawStroke(layerCanvas, stroke);

        Bitmap output = Bitmap.createBitmap(WIDTH, HEIGHT, Bitmap.Config.RGB_565);
        Canvas canvas = new Canvas(output);
        canvas.drawColor(Color.WHITE);
        canvas.drawBitmap(layer, 0, 0, new Paint(Paint.FILTER_BITMAP_FLAG));
        layer.recycle();
        return output;
    }

    private static void drawStroke(Canvas canvas, DoodleStroke stroke) {
        float[] pts = stroke.points;
        if (pts.length < 2) return;

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
        if (stroke.isEraser) {
            paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.CLEAR));
            paint.setColor(Color.BLACK);
        } else {
            paint.setColor(stroke.paintColor());
        }
        float lineWidth = Math.max(1.5f, stroke.width * HEIGHT / 400f);
        paint.setStrokeWidth(lineWidth);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);

        if (pts.length == 2) {
            paint.setStyle(Paint.Style.FILL);
            canvas.drawCircle(pts[0] * WIDTH, pts[1] * HEIGHT, lineWidth / 2f, paint);
            return;
        }

        paint.setStyle(Paint.Style.STROKE);
        Path path = new Path();
        path.moveTo(pts[0] * WIDTH, pts[1] * HEIGHT);
        for (int i = 2; i < pts.length; i += 2) {
            float prevX = pts[i - 2] * WIDTH;
            float prevY = pts[i - 1] * HEIGHT;
            float currX = pts[i] * WIDTH;
            float currY = pts[i + 1] * HEIGHT;
            path.quadTo(prevX, prevY, (prevX + currX) / 2f, (prevY + currY) / 2f);
        }
        path.lineTo(pts[pts.length - 2] * WIDTH, pts[pts.length - 1] * HEIGHT);
        canvas.drawPath(path, paint);
    }
}
