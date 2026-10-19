package com.catlendar.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class CatlendarWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "catlendar_widget_prefs";
    private static final String PREF_DATA = "widget_data";

    private static final String[] MONTH_NAMES = {
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    };

    private static final String[] MONTH_NAMES_SHORT = {
        "янв", "фев", "мар", "апр", "май", "июн",
        "июл", "авг", "сен", "окт", "ноя", "дек"
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName widgetComponent = new ComponentName(context, CatlendarWidgetProvider.class);
            int[] widgetIds = manager.getAppWidgetIds(widgetComponent);
            if (widgetIds != null && widgetIds.length > 0) {
                for (int widgetId : widgetIds) {
                    updateAppWidget(context, manager, widgetId);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.catlendar_widget);

            // Clicking widget launches MainActivity
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, flags);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            // Current date info
            Calendar today = Calendar.getInstance();
            int currentYear = today.get(Calendar.YEAR);
            int currentMonth = today.get(Calendar.MONTH); // 0-based
            int currentDay = today.get(Calendar.DAY_OF_MONTH);

            String monthTitle = MONTH_NAMES[currentMonth] + " " + currentYear;
            views.setTextViewText(R.id.widget_month_title, monthTitle);
            views.setTextViewText(R.id.widget_today_badge, currentDay + " " + MONTH_NAMES_SHORT[currentMonth]);

            // Load bookings map
            Map<String, BookingColor> bookedDays = loadBookingsMap(context);

            // Render calendar grid bitmap
            Bitmap gridBitmap = renderCalendarGrid(currentYear, currentMonth, currentDay, bookedDays);
            if (gridBitmap != null) {
                views.setImageViewBitmap(R.id.widget_calendar_grid, gridBitmap);
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static class BookingColor {
        int bgColor;
        int textColor;

        BookingColor(int bgColor, int textColor) {
            this.bgColor = bgColor;
            this.textColor = textColor;
        }
    }

    private static Map<String, BookingColor> loadBookingsMap(Context context) {
        Map<String, BookingColor> map = new HashMap<>();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String jsonStr = prefs.getString(PREF_DATA, null);
            if (jsonStr == null || jsonStr.trim().isEmpty()) {
                return map;
            }

            JSONObject obj = new JSONObject(jsonStr);
            JSONArray bookings = obj.optJSONArray("bookings");
            if (bookings == null) return map;

            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Calendar cal = Calendar.getInstance();

            for (int i = 0; i < bookings.length(); i++) {
                JSONObject b = bookings.getJSONObject(i);
                String startStr = b.optString("startDate");
                String endStr = b.optString("endDate");
                String colorStr = b.optString("color", "#FFD1DC");
                String textColStr = b.optString("textColor", "#2D1537");

                int bgColor;
                try {
                    bgColor = Color.parseColor(colorStr);
                } catch (Exception e) {
                    bgColor = Color.parseColor("#FFD1DC");
                }

                int textColor;
                try {
                    textColor = Color.parseColor(textColStr);
                } catch (Exception e) {
                    textColor = Color.parseColor("#2D1537");
                }

                if (!startStr.isEmpty() && !endStr.isEmpty()) {
                    cal.setTime(sdf.parse(startStr));
                    Calendar endCal = Calendar.getInstance();
                    endCal.setTime(sdf.parse(endStr));

                    while (!cal.after(endCal)) {
                        String dateKey = sdf.format(cal.getTime());
                        map.put(dateKey, new BookingColor(bgColor, textColor));
                        cal.add(Calendar.DAY_OF_MONTH, 1);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return map;
    }

    private static Bitmap renderCalendarGrid(int year, int month, int todayDay, Map<String, BookingColor> bookedDays) {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.YEAR, year);
        cal.set(Calendar.MONTH, month);
        cal.set(Calendar.DAY_OF_MONTH, 1);

        int daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH);

        // Day of week for 1st of month: Sunday=1, Monday=2 ... Saturday=7
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
        // Convert to Monday=0 .. Sunday=6 (Russian/ISO standard)
        int paddingStart = (dayOfWeek == Calendar.SUNDAY) ? 6 : (dayOfWeek - 2);

        int totalCells = paddingStart + daysInMonth;
        int numRows = (int) Math.ceil(totalCells / 7.0);

        int bitmapWidth = 700;
        float paddingX = 4f;
        float gap = 8f;
        float cellWidth = (bitmapWidth - (paddingX * 2) - (gap * 6)) / 7f;
        float cellHeight = cellWidth * 0.90f;
        float cornerRadius = cellWidth * 0.22f;

        int bitmapHeight = (int) (paddingX * 2 + numRows * cellHeight + (numRows - 1) * gap);

        Bitmap bitmap = Bitmap.createBitmap(bitmapWidth, Math.max(1, bitmapHeight), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));

        Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        strokePaint.setStyle(Paint.Style.STROKE);
        strokePaint.setStrokeWidth(3.5f);

        RectF rect = new RectF();

        for (int row = 0; row < numRows; row++) {
            for (int col = 0; col < 7; col++) {
                int cellIndex = row * 7 + col;
                int dayNumber = cellIndex - paddingStart + 1;

                if (dayNumber >= 1 && dayNumber <= daysInMonth) {
                    float left = paddingX + col * (cellWidth + gap);
                    float top = paddingX + row * (cellHeight + gap);
                    rect.set(left, top, left + cellWidth, top + cellHeight);

                    String dateKey = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayNumber);
                    boolean isBooked = bookedDays.containsKey(dateKey);
                    boolean isToday = (dayNumber == todayDay);

                    if (isBooked) {
                        BookingColor bc = bookedDays.get(dateKey);
                        paint.setColor(bc.bgColor);
                        paint.setStyle(Paint.Style.FILL);
                        canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint);

                        // Draw day number
                        textPaint.setColor(bc.textColor);
                        textPaint.setTextSize(cellHeight * 0.44f);
                        float textY = rect.centerY() - ((textPaint.descent() + textPaint.ascent()) / 2);
                        canvas.drawText(String.valueOf(dayNumber), rect.centerX(), textY, textPaint);

                        // Today indicator ring if booked
                        if (isToday) {
                            strokePaint.setColor(Color.parseColor("#334155"));
                            strokePaint.setStrokeWidth(4f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                        }
                    } else {
                        // Free day: clean white card with subtle stroke
                        paint.setColor(Color.parseColor("#FFFFFFFF"));
                        paint.setStyle(Paint.Style.FILL);
                        canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint);

                        strokePaint.setColor(Color.parseColor("#FFF0F3"));
                        strokePaint.setStrokeWidth(2f);
                        canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);

                        if (isToday) {
                            // Today indicator ring on free day
                            strokePaint.setColor(Color.parseColor("#FF477E"));
                            strokePaint.setStrokeWidth(4f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                            textPaint.setColor(Color.parseColor("#FF477E"));
                        } else {
                            // Weekend or weekday font color
                            if (col >= 5) {
                                textPaint.setColor(Color.parseColor("#F43F5E"));
                            } else {
                                textPaint.setColor(Color.parseColor("#475569"));
                            }
                        }

                        textPaint.setTextSize(cellHeight * 0.42f);
                        float textY = rect.centerY() - ((textPaint.descent() + textPaint.ascent()) / 2);
                        canvas.drawText(String.valueOf(dayNumber), rect.centerX(), textY, textPaint);
                    }
                }
            }
        }

        return bitmap;
    }
}
