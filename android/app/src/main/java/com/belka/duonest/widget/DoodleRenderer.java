package com.belka.duonest.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.RectF;
import java.util.List;

/** Draws the doodle like the "Wspólny rysunek" preview in pages/tabs/nest.vue (renderPreviewCanvas). */
final class DoodleRenderer {

    private static final int CARD_COLOR = Color.WHITE;
    private static final int BOARD_COLOR = Color.WHITE;
    private static final int BOARD_BORDER_COLOR = Color.parseColor("#eceef1");

    private DoodleRenderer() {}

    /**
     * @param width  bitmap width in px
     * @param height bitmap height in px
     * @param scale  bitmap px per device px, used for the border and corner radius
     */
    static Bitmap render(List<DoodleStroke> strokes, int width, int height, float density, float scale) {
        Bitmap layer = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas layerCanvas = new Canvas(layer);
        float lineScale = Math.min(width, height) / 400f;
        for (DoodleStroke stroke : strokes) drawStroke(layerCanvas, stroke, width, height, lineScale);

        // RGB_565 halves the RemoteViews payload; the corners take the card colour, so no alpha is needed.
        Bitmap output = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565);
        Canvas canvas = new Canvas(output);
        canvas.drawColor(CARD_COLOR);

        float border = Math.max(1f, density * scale);
        float radius = 24f * density * scale;
        RectF board = new RectF(border / 2f, border / 2f, width - border / 2f, height - border / 2f);

        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        fill.setColor(BOARD_COLOR);
        canvas.drawRoundRect(board, radius, radius, fill);

        Path clip = new Path();
        clip.addRoundRect(board, radius, radius, Path.Direction.CW);
        canvas.save();
        canvas.clipPath(clip);
        canvas.drawBitmap(layer, 0, 0, new Paint(Paint.FILTER_BITMAP_FLAG));
        canvas.restore();
        layer.recycle();

        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(border);
        stroke.setColor(BOARD_BORDER_COLOR);
        canvas.drawRoundRect(board, radius, radius, stroke);
        return output;
    }

    private static void drawStroke(Canvas canvas, DoodleStroke stroke, int width, int height, float lineScale) {
        float[] pts = stroke.points;
        if (pts.length < 2) return;

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
        if (stroke.isEraser) {
            paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.CLEAR));
            paint.setColor(Color.BLACK);
        } else {
            paint.setColor(stroke.paintColor());
        }
        float lineWidth = Math.max(1.5f, stroke.width * lineScale);
        paint.setStrokeWidth(lineWidth);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);

        if (pts.length == 2) {
            paint.setStyle(Paint.Style.FILL);
            canvas.drawCircle(pts[0] * width, pts[1] * height, lineWidth / 2f, paint);
            return;
        }

        paint.setStyle(Paint.Style.STROKE);
        Path path = new Path();
        path.moveTo(pts[0] * width, pts[1] * height);
        for (int i = 2; i < pts.length; i += 2) {
            float prevX = pts[i - 2] * width;
            float prevY = pts[i - 1] * height;
            float currX = pts[i] * width;
            float currY = pts[i + 1] * height;
            path.quadTo(prevX, prevY, (prevX + currX) / 2f, (prevY + currY) / 2f);
        }
        path.lineTo(pts[pts.length - 2] * width, pts[pts.length - 1] * height);
        canvas.drawPath(path, paint);
    }
}
