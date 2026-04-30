/*
 * MiMo Voice — MiMo API Translator (Android)
 * Replaces NLLB ONNX with MiMo V2.5-Pro API calls.
 *
 * Drop-in replacement for RTranslator's Translator.java
 * Maintains the same callback interfaces for compatibility.
 */

package nie.translator.rtranslator.voice_translation.neural_networks.translation;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import nie.translator.rtranslator.tools.CustomLocale;
import nie.translator.rtranslator.tools.ErrorCodes;
import nie.translator.rtranslator.voice_translation._conversation_mode._conversation.ConversationMessage;
import nie.translator.rtranslator.voice_translation.neural_networks.NeuralNetworkApiResult;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;


/**
 * MiMo V2.5-Pro translation engine.
 *
 * Replaces the local NLLB ONNX model with cloud-based MiMo API.
 * Adds context awareness: situation, domain, politeness levels.
 *
 * Usage:
 *   MiMoTranslator translator = new MiMoTranslator(context, apiKey);
 *   translator.translate("Hello", enLocale, jaLocale, "restaurant", listener);
 */
public class MiMoTranslator {
    private static final String TAG = "MiMoTranslator";
    private static final String BASE_URL = "https://api.xiaomimimo.com/v1";
    private static final String MODEL = "mimo-v2.5-pro";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    // Context presets
    public static final String SITUATION_GENERAL = "general";
    public static final String SITUATION_RESTAURANT = "restaurant";
    public static final String SITUATION_HOSPITAL = "hospital";
    public static final String SITUATION_AIRPORT = "airport";
    public static final String SITUATION_HOTEL = "hotel";
    public static final String SITUATION_STREET = "street";
    public static final String SITUATION_OFFICE = "office";
    public static final String SITUATION_EMERGENCY = "emergency";

    // Domain presets
    public static final String DOMAIN_GENERAL = "general";
    public static final String DOMAIN_MEDICAL = "medical";
    public static final String DOMAIN_LEGAL = "legal";
    public static final String DOMAIN_BUSINESS = "business";
    public static final String DOMAIN_TRAVEL = "travel";

    // Politeness presets
    public static final String POLITENESS_CASUAL = "casual";
    public static final String POLITENESS_FORMAL = "formal";
    public static final String POLITENESS_EMERGENCY = "emergency";

    private final Context context;
    private final String apiKey;
    private final OkHttpClient httpClient;
    private final Handler mainHandler;

    // Current context state
    private String currentSituation = SITUATION_GENERAL;
    private String currentDomain = DOMAIN_GENERAL;
    private String currentPoliteness = POLITENESS_CASUAL;

    // Callback interfaces (compatible with RTranslator)
    public interface TranslateListener {
        void onTranslatedText(String textToTranslate, String translatedText,
                              long resultID, boolean isFinal, CustomLocale languageOfText);
        void onFailure(int[] reasons, long value);
    }

    public interface TranslateMessageListener {
        void onTranslatedMessage(ConversationMessage message, long messageID, boolean isFinal);
        void onFailure(int[] reasons, long value);
    }

    /**
     * Initialize MiMo Translator.
     *
     * @param context Android context
     * @param apiKey  MiMo API key from https://platform.xiaomimimo.com
     */
    public MiMoTranslator(@NonNull Context context, @NonNull String apiKey) {
        this.context = context;
        this.apiKey = apiKey;
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();

        Log.i(TAG, "MiMo Translator initialized with API key: "
                + apiKey.substring(0, Math.min(8, apiKey.length())) + "...");
    }

    /**
     * Set the current conversation context.
     * Call this when situation changes (entering restaurant, hospital, etc.)
     */
    public void setContext(String situation, String domain, String politeness) {
        this.currentSituation = situation;
        this.currentDomain = domain;
        this.currentPoliteness = politeness;
        Log.i(TAG, "Context updated: " + situation + ", " + domain + ", " + politeness);
    }

    /**
     * Translate text with context awareness.
     *
     * @param textToTranslate  Source text
     * @param inputLanguage    Source language
     * @param outputLanguage   Target language
     * @param listener         Callback listener
     */
    public void translate(@NonNull String textToTranslate,
                          @NonNull CustomLocale inputLanguage,
                          @NonNull CustomLocale outputLanguage,
                          @NonNull TranslateListener listener) {
        translate(textToTranslate, inputLanguage, outputLanguage,
                currentSituation, currentDomain, currentPoliteness, listener);
    }

    /**
     * Translate text with explicit context.
     */
    public void translate(@NonNull String textToTranslate,
                          @NonNull CustomLocale inputLanguage,
                          @NonNull CustomLocale outputLanguage,
                          @NonNull String situation,
                          @NonNull String domain,
                          @NonNull String politeness,
                          @NonNull TranslateListener listener) {

        long startTime = System.currentTimeMillis();

        // Skip translation if same language
        if (inputLanguage.getCode().equals(outputLanguage.getCode())) {
            listener.onTranslatedText(textToTranslate, textToTranslate,
                    System.currentTimeMillis(), true, outputLanguage);
            return;
        }

        // Build the system prompt with context
        String systemPrompt = buildSystemPrompt(situation, domain, politeness,
                inputLanguage.getCode(), outputLanguage.getCode());

        // Build API request
        JSONObject request = new JSONObject();
        try {
            request.put("model", MODEL);
            request.put("temperature", 0.3);
            request.put("max_tokens", 2048);
            request.put("stream", false);

            JSONArray messages = new JSONArray();

            // System message
            JSONObject systemMessage = new JSONObject();
            systemMessage.put("role", "system");
            systemMessage.put("content", systemPrompt);
            messages.put(systemMessage);

            // User message with text to translate
            JSONObject userMessage = new JSONObject();
            userMessage.put("role", "user");
            userMessage.put("content", "Translate: \"" + textToTranslate + "\"");
            messages.put(userMessage);

            request.put("messages", messages);
        } catch (JSONException e) {
            listener.onFailure(new int[]{ErrorCodes.ERROR_EXECUTING_MODEL}, 0);
            return;
        }

        // Make API call
        Request apiRequest = new Request.Builder()
                .url(BASE_URL + "/chat/completions")
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(request.toString(), JSON))
                .build();

        httpClient.newCall(apiRequest).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "API call failed: " + e.getMessage());
                mainHandler.post(() ->
                        listener.onFailure(new int[]{ErrorCodes.ERROR_EXECUTING_MODEL}, 0));
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                try {
                    if (!response.isSuccessful()) {
                        Log.e(TAG, "API error: " + response.code());
                        mainHandler.post(() ->
                                listener.onFailure(new int[]{ErrorCodes.ERROR_EXECUTING_MODEL}, 0));
                        return;
                    }

                    String responseBody = response.body().string();
                    JSONObject json = new JSONObject(responseBody);
                    String translatedText = json.getJSONArray("choices")
                            .getJSONObject(0)
                            .getJSONObject("message")
                            .getString("content")
                            .trim();

                    // Clean up common LLM artifacts
                    translatedText = cleanTranslation(translatedText);

                    long latency = System.currentTimeMillis() - startTime;
                    Log.i(TAG, "Translation completed in " + latency + "ms");
                    Log.i(TAG, "\"" + textToTranslate + "\" → \"" + translatedText + "\"");

                    long resultId = System.currentTimeMillis();
                    mainHandler.post(() ->
                            listener.onTranslatedText(textToTranslate, translatedText,
                                    resultId, true, outputLanguage));

                } catch (JSONException e) {
                    Log.e(TAG, "JSON parse error: " + e.getMessage());
                    mainHandler.post(() ->
                            listener.onFailure(new int[]{ErrorCodes.ERROR_EXECUTING_MODEL}, 0));
                }
            }
        });
    }

    /**
     * Translate a conversation message (compatible with RTranslator).
     */
    public void translateMessage(@NonNull ConversationMessage message,
                                 @NonNull CustomLocale outputLanguage,
                                 @NonNull TranslateMessageListener listener) {
        String text = message.getPayload().getText();
        CustomLocale inputLanguage = message.getPayload().getLanguage();

        translate(text, inputLanguage, outputLanguage, new TranslateListener() {
            @Override
            public void onTranslatedText(String textToTranslate, String translatedText,
                                          long resultID, boolean isFinal, CustomLocale languageOfText) {
                message.getPayload().setText(translatedText);
                message.getPayload().setLanguage(outputLanguage);
                mainHandler.post(() -> listener.onTranslatedMessage(message, resultID, isFinal));
            }

            @Override
            public void onFailure(int[] reasons, long value) {
                mainHandler.post(() -> listener.onFailure(reasons, value));
            }
        });
    }

    /**
     * Build system prompt with context awareness.
     */
    private String buildSystemPrompt(String situation, String domain, String politeness,
                                      String sourceLang, String targetLang) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a professional translator powered by MiMo.\n");

        // Add situation context
        if (!situation.equals(SITUATION_GENERAL)) {
            prompt.append("The user is in a ").append(situation).append(" situation.\n");
            prompt.append(getSituationHint(situation));
        }

        prompt.append("Translate from ").append(sourceLang).append(" to ").append(targetLang).append(".\n");
        prompt.append("Translate MEANING, not words literally.\n");
        prompt.append("Use politeness level: ").append(politeness).append(".\n");
        prompt.append("Use domain vocabulary: ").append(domain).append(".\n");
        prompt.append("If idiom, translate the MEANING, not literal words.\n");
        prompt.append("If cultural context matters, add brief note in brackets.\n");
        prompt.append("Output ONLY the translation, nothing else.");

        return prompt.toString();
    }

    /**
     * Get situation-specific hints for better translation.
     */
    private String getSituationHint(String situation) {
        switch (situation) {
            case SITUATION_RESTAURANT:
                return "Food/dining vocabulary. 'Check' means bill, not bank check.\n";
            case SITUATION_HOSPITAL:
                return "Medical context. Use correct medical terminology. Be precise.\n";
            case SITUATION_AIRPORT:
                return "Airport/travel context. Flight, boarding, customs vocabulary.\n";
            case SITUATION_HOTEL:
                return "Hotel/accommodation context. Booking, check-in vocabulary.\n";
            case SITUATION_STREET:
                return "Street/directions context. Navigation vocabulary.\n";
            case SITUATION_OFFICE:
                return "Office/business context. Professional vocabulary.\n";
            case SITUATION_EMERGENCY:
                return "EMERGENCY. Translate urgently and clearly. No pleasantries.\n";
            default:
                return "";
        }
    }

    /**
     * Clean up LLM translation artifacts.
     */
    private String cleanTranslation(String text) {
        // Remove surrounding quotes
        if ((text.startsWith("\"") && text.endsWith("\""))
                || (text.startsWith("'") && text.endsWith("'"))) {
            text = text.substring(1, text.length() - 1);
        }
        // Remove "Translation:" prefix
        String[] prefixes = {"Translation:", "translation:", "Translated:", "translated:"};
        for (String prefix : prefixes) {
            if (text.startsWith(prefix)) {
                text = text.substring(prefix.length()).trim();
            }
        }
        return text.trim();
    }

    /**
     * Detect language using MiMo (replacement for ML Kit language detection).
     */
    public void detectLanguage(@NonNull String text, @NonNull LanguageDetectListener listener) {
        JSONObject request = new JSONObject();
        try {
            request.put("model", MODEL);
            request.put("temperature", 0.1);
            request.put("max_tokens", 10);

            JSONArray messages = new JSONArray();
            JSONObject msg = new JSONObject();
            msg.put("role", "user");
            msg.put("content", "What language is this? Reply with ONLY the ISO 639-1 code (e.g., en, ja, zh, ko, es, fr, de): \"" + text + "\"");
            messages.put(msg);
            request.put("messages", messages);
        } catch (JSONException e) {
            listener.onFailure(new int[]{ErrorCodes.ERROR_EXECUTING_MODEL}, 0);
            return;
        }

        Request apiRequest = new Request.Builder()
                .url(BASE_URL + "/chat/completions")
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(request.toString(), JSON))
                .build();

        httpClient.newCall(apiRequest).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                mainHandler.post(() -> listener.onFailure(new int[]{ErrorCodes.ERROR_EXECUTING_MODEL}, 0));
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                try {
                    String body = response.body().string();
                    JSONObject json = new JSONObject(body);
                    String langCode = json.getJSONArray("choices")
                            .getJSONObject(0)
                            .getJSONObject("message")
                            .getString("content")
                            .trim()
                            .toLowerCase();

                    CustomLocale locale = CustomLocale.getInstance(langCode);
                    mainHandler.post(() -> listener.onLanguageDetected(locale));
                } catch (JSONException e) {
                    mainHandler.post(() -> listener.onFailure(new int[]{ErrorCodes.ERROR_EXECUTING_MODEL}, 0));
                }
            }
        });
    }

    public interface LanguageDetectListener {
        void onLanguageDetected(CustomLocale locale);
        void onFailure(int[] reasons, long value);
    }

    /**
     * Get supported languages (MiMo supports 50+ languages).
     */
    public static ArrayList<CustomLocale> getSupportedLanguages() {
        ArrayList<CustomLocale> languages = new ArrayList<>();
        String[] codes = {
                "en", "zh", "ja", "ko", "es", "fr", "de", "it", "pt", "ru",
                "ar", "hi", "th", "vi", "id", "ms", "tr", "pl", "nl", "sv",
                "da", "no", "fi", "el", "he", "cs", "ro", "hu", "sk", "uk",
                "bg", "hr", "sr", "sl", "et", "lv", "lt", "bn", "ta", "te",
                "ur", "sw", "am", "my", "km", "lo", "si", "ka", "az", "uz",
                "kk", "mn", "ne", "mr", "gu", "kn", "ml", "or", "pa", "fil"
        };
        for (String code : codes) {
            languages.add(CustomLocale.getInstance(code));
        }
        return languages;
    }

    /**
     * Release resources.
     */
    public void shutdown() {
        httpClient.dispatcher().executorService().shutdown();
    }
}
