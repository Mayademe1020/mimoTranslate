/*
 * MiMo Voice — MiMo TTS (Android)
 * Replaces gTTS with MiMo V2-TTS for natural speech synthesis.
 */

package nie.translator.rtranslator.voice_translation.neural_networks.translation;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;


/**
 * MiMo V2-TTS client for Android.
 *
 * Replaces gTTS (robotic) with natural, expressive speech synthesis.
 * Supports emotion, proper intonation, and natural pacing.
 *
 * Usage:
 *   MiMoTTS tts = new MiMoTTS(context, apiKey);
 *   tts.synthesize("Hello!", "en", "neutral", listener);
 */
public class MiMoTTS {
    private static final String TAG = "MiMoTTS";
    private static final String BASE_URL = "https://api.xiaomimimo.com/v1";
    private static final String MODEL = "mimo-v2-tts";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    // Emotion presets
    public static final String EMOTION_NEUTRAL = "neutral";
    public static final String EMOTION_HAPPY = "happy";
    public static final String EMOTION_SAD = "sad";
    public static final String EMOTION_URGENT = "urgent";
    public static final String EMOTION_CALM = "calm";

    // Voice presets per language
    private static final Map<String, String[]> VOICE_PRESETS = new HashMap<>();
    static {
        VOICE_PRESETS.put("en", new String[]{"nova", "echo", "nova"});
        VOICE_PRESETS.put("ja", new String[]{"yuki", "haru", "yuki"});
        VOICE_PRESETS.put("zh", new String[]{"xiaoyi", "yunxi", "xiaoyi"});
        VOICE_PRESETS.put("ko", new String[]{"minji", "hyunwoo", "minji"});
        VOICE_PRESETS.put("es", new String[]{"elena", "carlos", "elena"});
        VOICE_PRESETS.put("fr", new String[]{"claire", "antoine", "claire"});
        VOICE_PRESETS.put("de", new String[]{"hanna", "maximilian", "hanna"});
    }

    private final Context context;
    private final String apiKey;
    private final OkHttpClient httpClient;
    private final Handler mainHandler;

    public interface TTSListener {
        void onAudioReady(byte[] audioData, String format);
        void onFailure(int[] reasons, long value);
    }

    /**
     * Initialize MiMo TTS.
     *
     * @param context Android context
     * @param apiKey  MiMo API key
     */
    public MiMoTTS(@NonNull Context context, @NonNull String apiKey) {
        this.context = context;
        this.apiKey = apiKey;
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Synthesize speech from text.
     *
     * @param text     Text to speak
     * @param language Language code (e.g., "en", "ja")
     * @param emotion  Emotion preset
     * @param listener Callback with audio data
     */
    public void synthesize(@NonNull String text,
                           @NonNull String language,
                           @NonNull String emotion,
                           @NonNull TTSListener listener) {
        synthesize(text, language, null, emotion, 1.0f, listener);
    }

    /**
     * Synthesize speech with full options.
     */
    public void synthesize(@NonNull String text,
                           @NonNull String language,
                           @Nullable String voice,
                           @NonNull String emotion,
                           float speed,
                           @NonNull TTSListener listener) {

        if (voice == null) {
            voice = getDefaultVoice(language);
        }

        long startTime = System.currentTimeMillis();

        JSONObject request = new JSONObject();
        try {
            request.put("model", MODEL);
            request.put("input", text);
            request.put("voice", voice);
            request.put("speed", speed);
            request.put("response_format", "wav");
            request.put("language", language);

            // Add emotion instruction
            if (!emotion.equals(EMOTION_NEUTRAL)) {
                request.put("instruction", getEmotionInstruction(emotion));
            }
        } catch (JSONException e) {
            listener.onFailure(new int[]{nie.translator.rtranslator.tools.ErrorCodes.ERROR_EXECUTING_MODEL}, 0);
            return;
        }

        Request apiRequest = new Request.Builder()
                .url(BASE_URL + "/audio/speech")
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(request.toString(), JSON))
                .build();

        httpClient.newCall(apiRequest).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "TTS call failed: " + e.getMessage());
                mainHandler.post(() ->
                        listener.onFailure(new int[]{nie.translator.rtranslator.tools.ErrorCodes.ERROR_EXECUTING_MODEL}, 0));
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (!response.isSuccessful()) {
                    Log.e(TAG, "TTS API error: " + response.code());
                    mainHandler.post(() ->
                            listener.onFailure(new int[]{nie.translator.rtranslator.tools.ErrorCodes.ERROR_EXECUTING_MODEL}, 0));
                    return;
                }

                byte[] audioData = response.body().bytes();
                long latency = System.currentTimeMillis() - startTime;
                Log.i(TAG, "TTS completed: " + audioData.length + " bytes in " + latency + "ms");

                mainHandler.post(() -> listener.onAudioReady(audioData, "wav"));
            }
        });
    }

    /**
     * Synthesize and play directly.
     */
    public void synthesizeAndPlay(@NonNull String text,
                                   @NonNull String language,
                                   @NonNull String emotion) {
        synthesize(text, language, emotion, new TTSListener() {
            @Override
            public void onAudioReady(byte[] audioData, String format) {
                playAudio(audioData);
            }

            @Override
            public void onFailure(int[] reasons, long value) {
                Log.e(TAG, "TTS failed");
            }
        });
    }

    /**
     * Play WAV audio data.
     */
    private void playAudio(byte[] wavData) {
        // Skip WAV header (44 bytes) for PCM playback
        int headerSize = 44;
        byte[] pcmData = new byte[wavData.length - headerSize];
        System.arraycopy(wavData, headerSize, pcmData, 0, pcmData.length);

        int sampleRate = 24000; // MiMo TTS default
        int channelConfig = AudioFormat.CHANNEL_OUT_MONO;
        int audioFormat = AudioFormat.ENCODING_PCM_16BIT;

        AudioTrack audioTrack = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build())
                .setAudioFormat(new AudioFormat.Builder()
                        .setEncoding(audioFormat)
                        .setSampleRate(sampleRate)
                        .setChannelMask(channelConfig)
                        .build())
                .setBufferSizeInBytes(pcmData.length)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build();

        audioTrack.write(pcmData, 0, pcmData.length);
        audioTrack.play();

        // Release after playback
        audioTrack.setNotificationMarkerPosition(pcmData.length / 2);
        audioTrack.setPlaybackPositionUpdateListener(new AudioTrack.OnPlaybackPositionUpdateListener() {
            @Override
            public void onMarkerReached(AudioTrack track) {
                track.release();
            }
            @Override
            public void onPeriodicNotification(AudioTrack track) {}
        });
    }

    /**
     * Get default voice for language.
     */
    private String getDefaultVoice(String language) {
        String[] voices = VOICE_PRESETS.get(language);
        if (voices != null) {
            return voices[0]; // Default voice
        }
        return "nova"; // Fallback
    }

    /**
     * Get emotion instruction for TTS.
     */
    private String getEmotionInstruction(String emotion) {
        switch (emotion) {
            case EMOTION_HAPPY:
                return "Speak with a warm, happy tone.";
            case EMOTION_SAD:
                return "Speak with a gentle, somber tone.";
            case EMOTION_URGENT:
                return "Speak urgently and clearly. Important!";
            case EMOTION_CALM:
                return "Speak calmly and soothingly.";
            default:
                return "";
        }
    }

    /**
     * Release resources.
     */
    public void shutdown() {
        httpClient.dispatcher().executorService().shutdown();
    }
}
