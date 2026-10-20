package com.catlendar.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    private static final String PREFS_NAME = "catlendar_widget_prefs";
    private static final String PREF_DATA = "widget_data";

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        String data = call.getString("data");
        if (data != null) {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(PREF_DATA, data).apply();

            // Notify widget provider to re-render all home screen widgets
            CatlendarWidgetProvider.updateAllWidgets(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void setWidgetTheme(PluginCall call) {
        String theme = call.getString("theme");
        if (theme != null) {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(CatlendarWidgetProvider.PREF_THEME, theme).apply();
            CatlendarWidgetProvider.updateAllWidgets(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void getWidgetTheme(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String theme = prefs.getString(CatlendarWidgetProvider.PREF_THEME, CatlendarWidgetProvider.THEME_CLASSIC);
        JSObject ret = new JSObject();
        ret.put("theme", theme);
        call.resolve(ret);
    }
}
