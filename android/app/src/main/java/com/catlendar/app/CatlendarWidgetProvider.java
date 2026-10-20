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
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class CatlendarWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "catlendar_widget_prefs";
    public static final String PREF_DATA = "widget_data";
    public static final String PREF_THEME = "widget_theme";

    public static final String ACTION_TOGGLE_THEME = "com.catlendar.app.ACTION_TOGGLE_THEME";

    public static final String THEME_CLASSIC = "classic";
    public static final String THEME_GLASS_LIGHT = "glass_light";
    public static final String THEME_GLASS_DARK = "glass_dark";

    private static final String[] MONTH_NAMES = {
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    };

    private static final String[] MONTH_NAMES_SHORT = {
        "янв", "фев", "мар", "апр", "май", "июн",
        "июл", "авг", "сен", "окт", "ноя", "дек"
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_TOGGLE_THEME.equals(intent.getAction())) {
            cycleWidgetTheme(context);
            updateAllWidgets(context);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateAppWidget(context, appWidgetManager, appWidgetId);
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
    }

    public static void cycleWidgetTheme(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String current = prefs.getString(PREF_THEME, THEME_CLASSIC);
        String next;
        if (THEME_CLASSIC.equals(current)) {
            next = THEME_GLASS_LIGHT;
        } else if (THEME_GLASS_LIGHT.equals(current)) {
            next = THEME_GLASS_DARK;
        } else {
            next = THEME_CLASSIC;
        }
        prefs.edit().putString(PREF_THEME, next).apply();
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

            // 1. Root tap launches MainActivity
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, flags);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            // 2. Theme toggle button click
            Intent toggleIntent = new Intent(context, CatlendarWidgetProvider.class);
            toggleIntent.setAction(ACTION_TOGGLE_THEME);
            PendingIntent togglePendingIntent = PendingIntent.getBroadcast(context, 101, toggleIntent, flags);
            views.setOnClickPendingIntent(R.id.widget_theme_toggle, togglePendingIntent);

            // 3. Detect widget size options
            Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
            int minWidth = (options != null) ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) : 0;
            int minHeight = (options != null) ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) : 0;

            boolean isNarrow = (minWidth > 0 && minWidth < 185);
            boolean isShort = (minHeight > 0 && minHeight < 140);
            boolean isCompact = isNarrow || isShort;

            // 4. Current date info
            Calendar today = Calendar.getInstance();
            int currentYear = today.get(Calendar.YEAR);
            int currentMonth = today.get(Calendar.MONTH); // 0-based
            int currentDay = today.get(Calendar.DAY_OF_MONTH);

            if (isNarrow) {
                views.setTextViewText(R.id.widget_month_title, MONTH_NAMES_SHORT[currentMonth] + " " + currentYear);
                views.setViewVisibility(R.id.widget_today_badge, View.GONE);
            } else {
                views.setTextViewText(R.id.widget_month_title, MONTH_NAMES[currentMonth] + " " + currentYear);
                views.setViewVisibility(R.id.widget_today_badge, View.VISIBLE);
                views.setTextViewText(R.id.widget_today_badge, currentDay + " " + MONTH_NAMES_SHORT[currentMonth]);
            }

            // 5. Apply Theme Styling
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String theme = prefs.getString(PREF_THEME, THEME_CLASSIC);

            applyTheme(views, theme);

            // 6. Load bookings map & render grid bitmap
            Map<String, BookingColor> bookedDays = loadBookingsMap(context);
            Bitmap gridBitmap = renderCalendarGrid(currentYear, currentMonth, currentDay, bookedDays, theme, isCompact);
            if (gridBitmap != null) {
                views.setImageViewBitmap(R.id.widget_calendar_grid, gridBitmap);
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void applyTheme(RemoteViews views, String theme) {
        int bgResId;
        int titleColor;
        int badgeBgResId;
        int badgeTextColor;
        int toggleIconResId;
        int weekdayColor;
        int weekendColor;

        if (THEME_GLASS_DARK.equals(theme)) {
            bgResId = R.drawable.widget_bg_glass_dark;
            titleColor = Color.parseColor("#F8FAFC");
            badgeBgResId = R.drawable.widget_badge_glass_dark;
            badgeTextColor = Color.parseColor("#FF8DA9");
            toggleIconResId = R.drawable.ic_widget_theme_moon;
            weekdayColor = Color.parseColor("#94A3B8");
            weekendColor = Color.parseColor("#FB7185");
        } else if (THEME_GLASS_LIGHT.equals(theme)) {
            bgResId = R.drawable.widget_bg_glass_light;
            titleColor = Color.parseColor("#0F172A");
            badgeBgResId = R.drawable.widget_badge_glass_light;
            badgeTextColor = Color.parseColor("#E11D48");
            toggleIconResId = R.drawable.ic_widget_theme_glass;
            weekdayColor = Color.parseColor("#475569");
            weekendColor = Color.parseColor("#E11D48");
        } else {
            // THEME_CLASSIC
            bgResId = R.drawable.widget_bg_classic;
            titleColor = Color.parseColor("#1E293B");
            badgeBgResId = R.drawable.widget_badge_bg;
            badgeTextColor = Color.parseColor("#FF477E");
            toggleIconResId = R.drawable.ic_widget_theme_sun;
            weekdayColor = Color.parseColor("#94A3B8");
            weekendColor = Color.parseColor("#F43F5E");
        }

        views.setInt(R.id.widget_root, "setBackgroundResource", bgResId);
        views.setTextColor(R.id.widget_month_title, titleColor);
        views.setInt(R.id.widget_today_badge, "setBackgroundResource", badgeBgResId);
        views.setTextColor(R.id.widget_today_badge, badgeTextColor);
        views.setImageViewResource(R.id.widget_theme_toggle, toggleIconResId);

        // Weekday label colors
        views.setTextColor(R.id.widget_wd_1, weekdayColor);
        views.setTextColor(R.id.widget_wd_2, weekdayColor);
        views.setTextColor(R.id.widget_wd_3, weekdayColor);
        views.setTextColor(R.id.widget_wd_4, weekdayColor);
        views.setTextColor(R.id.widget_wd_5, weekdayColor);
        views.setTextColor(R.id.widget_wd_6, weekendColor);
        views.setTextColor(R.id.widget_wd_7, weekendColor);
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

    private static Bitmap renderCalendarGrid(int year, int month, int todayDay, Map<String, BookingColor> bookedDays, String theme, boolean isCompact) {
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
        float paddingX = isCompact ? 2f : 4f;
        float gap = isCompact ? 5.5f : 7.5f;
        float cellWidth = (bitmapWidth - (paddingX * 2) - (gap * 6)) / 7f;
        float cellHeight = cellWidth * (isCompact ? 0.86f : 0.90f);
        float cornerRadius = cellWidth * (isCompact ? 0.20f : 0.22f);

        int bitmapHeight = (int) (paddingX * 2 + numRows * cellHeight + (numRows - 1) * gap);

        Bitmap bitmap = Bitmap.createBitmap(bitmapWidth, Math.max(1, bitmapHeight), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));

        Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        strokePaint.setStyle(Paint.Style.STROKE);

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

                        // Subtle rim stroke for glass themes on booked days
                        if (THEME_GLASS_DARK.equals(theme)) {
                            strokePaint.setColor(Color.parseColor("#33FFFFFF"));
                            strokePaint.setStrokeWidth(2f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                        } else if (THEME_GLASS_LIGHT.equals(theme)) {
                            strokePaint.setColor(Color.parseColor("#4DFFFFFF"));
                            strokePaint.setStrokeWidth(2f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                        }

                        // Draw day number
                        textPaint.setColor(bc.textColor);
                        textPaint.setTextSize(cellHeight * 0.44f);
                        float textY = rect.centerY() - ((textPaint.descent() + textPaint.ascent()) / 2);
                        canvas.drawText(String.valueOf(dayNumber), rect.centerX(), textY, textPaint);

                        // Today indicator ring if booked
                        if (isToday) {
                            if (THEME_GLASS_DARK.equals(theme)) {
                                strokePaint.setColor(Color.parseColor("#FFFFFF"));
                            } else if (THEME_GLASS_LIGHT.equals(theme)) {
                                strokePaint.setColor(Color.parseColor("#0F172A"));
                            } else {
                                strokePaint.setColor(Color.parseColor("#334155"));
                            }
                            strokePaint.setStrokeWidth(4f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                        }
                    } else {
                        // Free day cell according to theme
                        if (THEME_GLASS_DARK.equals(theme)) {
                            // Translucent dark glass cell
                            paint.setColor(Color.parseColor("#29FFFFFF"));
                            paint.setStyle(Paint.Style.FILL);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint);

                            strokePaint.setColor(Color.parseColor("#26FFFFFF"));
                            strokePaint.setStrokeWidth(1.8f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);

                            if (isToday) {
                                strokePaint.setColor(Color.parseColor("#FF6B95"));
                                strokePaint.setStrokeWidth(3.8f);
                                canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                                textPaint.setColor(Color.parseColor("#FF6B95"));
                            } else {
                                if (col >= 5) {
                                    textPaint.setColor(Color.parseColor("#FB7185"));
                                } else {
                                    textPaint.setColor(Color.parseColor("#E2E8F0"));
                                }
                            }
                        } else if (THEME_GLASS_LIGHT.equals(theme)) {
                            // Frosted light glass cell
                            paint.setColor(Color.parseColor("#59FFFFFF"));
                            paint.setStyle(Paint.Style.FILL);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint);

                            strokePaint.setColor(Color.parseColor("#80FFFFFF"));
                            strokePaint.setStrokeWidth(2f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);

                            if (isToday) {
                                strokePaint.setColor(Color.parseColor("#E11D48"));
                                strokePaint.setStrokeWidth(3.8f);
                                canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                                textPaint.setColor(Color.parseColor("#E11D48"));
                            } else {
                                if (col >= 5) {
                                    textPaint.setColor(Color.parseColor("#E11D48"));
                                } else {
                                    textPaint.setColor(Color.parseColor("#0F172A"));
                                }
                            }
                        } else {
                            // THEME_CLASSIC: Clean white card with subtle stroke
                            paint.setColor(Color.parseColor("#FFFFFFFF"));
                            paint.setStyle(Paint.Style.FILL);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, paint);

                            strokePaint.setColor(Color.parseColor("#FFF0F3"));
                            strokePaint.setStrokeWidth(2f);
                            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);

                            if (isToday) {
                                strokePaint.setColor(Color.parseColor("#FF477E"));
                                strokePaint.setStrokeWidth(3.8f);
                                canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint);
                                textPaint.setColor(Color.parseColor("#FF477E"));
                            } else {
                                if (col >= 5) {
                                    textPaint.setColor(Color.parseColor("#F43F5E"));
                                } else {
                                    textPaint.setColor(Color.parseColor("#475569"));
                                }
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
