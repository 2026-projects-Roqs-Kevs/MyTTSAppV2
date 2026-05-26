package com.myttsappv2

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import android.util.Log
import kotlin.math.*

class MFCCModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MFCCModule"

    companion object {
        private const val TAG = "MFCCModule"
        private const val SAMPLE_RATE = 16000
        private const val NUM_MFCC = 13
        private const val NUM_MEL_FILTERS = 26
        private const val FFT_SIZE = 512
        private const val FRAME_SIZE = 400   // 25ms at 16kHz
        private const val FRAME_STEP = 160   // 10ms at 16kHz
        private const val PRE_EMPHASIS = 0.97f
        private const val MIN_SAMPLES = 8000 // 0.5s minimum
        // Output vector = 13 MFCC means + 13 MFCC stds + 13 delta means = 39
        private const val VECTOR_SIZE = 39
    }

    @ReactMethod
    fun computeMFCC(pcmArray: com.facebook.react.bridge.ReadableArray, promise: Promise) {
        try {
            val samples = ShortArray(pcmArray.size()) { pcmArray.getInt(it).toShort() }

            if (samples.size < MIN_SAMPLES) {
                Log.d(TAG, "Utterance too short (${samples.size} samples), skipping MFCC")
                promise.reject("TOO_SHORT", "Utterance too short for reliable MFCC")
                return
            }

            val vector = computeFeatureVector(samples)
            val result: WritableArray = Arguments.createArray()
            vector.forEach { result.pushDouble(it.toDouble()) }
            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "MFCC computation failed", e)
            promise.reject("MFCC_ERROR", e.message)
        }
    }

    // ── Feature vector: MFCC means + MFCC stds + delta means ────────────────
    // 13 + 13 + 13 = 39 dimensions
    // More discriminative than mean-only because:
    // - stds capture how much the voice varies (stable per speaker)
    // - deltas capture vocal dynamics (rate of change, unique per speaker)
    // - NO global mean subtraction (preserves inter-speaker differences)

    private fun computeFeatureVector(samples: ShortArray): FloatArray {
        // 1. Convert to float
        val floats = FloatArray(samples.size) { samples[it] / 32768.0f }

        // 2. Pre-emphasis
        val emphasized = FloatArray(floats.size)
        emphasized[0] = floats[0]
        for (i in 1 until floats.size) {
            emphasized[i] = floats[i] - PRE_EMPHASIS * floats[i - 1]
        }

        // 3. Frame + window
        val frames = frameSignal(emphasized)
        if (frames.isEmpty()) return FloatArray(VECTOR_SIZE)

        val window = hammingWindow(FRAME_SIZE)
        val windowed = frames.map { frame ->
            FloatArray(FRAME_SIZE) { i ->
                if (i < frame.size) frame[i] * window[i] else 0f
            }
        }

        // 4. Power spectrum per frame
        val powerSpectra = windowed.map { frame ->
            val padded = FloatArray(FFT_SIZE)
            frame.copyInto(padded)
            powerSpectrum(padded)
        }

        // 5. Mel filterbank
        val melFilters = melFilterbank(NUM_MEL_FILTERS, FFT_SIZE, SAMPLE_RATE)

        // 6. MFCC per frame (no mean subtraction)
        val frameMFCCs: List<FloatArray> = powerSpectra.map { spectrum ->
            val melEnergies = FloatArray(NUM_MEL_FILTERS) { filterIdx ->
                val energy = melFilters[filterIdx].indices.sumOf {
                    (spectrum[it] * melFilters[filterIdx][it]).toDouble()
                }.toFloat()
                ln(energy.coerceAtLeast(1e-10f))
            }
            dct(melEnergies, NUM_MFCC)
        }

        // 7. Mean of each MFCC coefficient across frames
        val means = FloatArray(NUM_MFCC)
        for (frame in frameMFCCs) {
            for (i in 0 until NUM_MFCC) means[i] = means[i] + frame[i]
        }
        for (i in 0 until NUM_MFCC) means[i] = means[i] / frameMFCCs.size.toFloat()

        // 8. Std dev of each MFCC coefficient across frames
        // Captures how "stable" each speaker's voice is — highly speaker-specific
        val stds = FloatArray(NUM_MFCC)
        for (frame in frameMFCCs) {
            for (i in 0 until NUM_MFCC) {
                val diff = frame[i] - means[i]
                stds[i] = stds[i] + diff * diff
            }
        }
        for (i in 0 until NUM_MFCC) {
            stds[i] = sqrt(stds[i] / frameMFCCs.size.toFloat()).coerceAtLeast(1e-10f)
        }

        // 9. Delta MFCCs — rate of change between frames (captures speech dynamics)
        // Delta[t] = sum(n * (frame[t+n] - frame[t-n])) / 2*sum(n^2), n=1..2
        val N = 2
        val deltaFrames = mutableListOf<FloatArray>()
        for (t in N until frameMFCCs.size - N) {
            val delta = FloatArray(NUM_MFCC)
            var denom = 0f
            for (n in 1..N) {
                denom = denom + (n * n).toFloat()
                for (i in 0 until NUM_MFCC) {
                    delta[i] = delta[i] + n * (frameMFCCs[t + n][i] - frameMFCCs[t - n][i])
                }
            }
            denom = denom * 2f
            for (i in 0 until NUM_MFCC) delta[i] = delta[i] / denom
            deltaFrames.add(delta)
        }

        val deltaMeans = FloatArray(NUM_MFCC)
        if (deltaFrames.isNotEmpty()) {
            for (frame in deltaFrames) {
                for (i in 0 until NUM_MFCC) deltaMeans[i] = deltaMeans[i] + frame[i]
            }
            for (i in 0 until NUM_MFCC) deltaMeans[i] = deltaMeans[i] / deltaFrames.size.toFloat()
        }

        // 10. Concatenate: [means(13), stds(13), deltaMeans(13)] = 39 dims
        return FloatArray(VECTOR_SIZE) { i ->
            when {
                i < NUM_MFCC -> means[i]
                i < NUM_MFCC * 2 -> stds[i - NUM_MFCC]
                else -> deltaMeans[i - NUM_MFCC * 2]
            }
        }
    }

    // ── Signal processing ────────────────────────────────────────────────────

    private fun frameSignal(signal: FloatArray): List<FloatArray> {
        val frames = mutableListOf<FloatArray>()
        var start = 0
        while (start + FRAME_SIZE <= signal.size) {
            frames.add(signal.copyOfRange(start, start + FRAME_SIZE))
            start += FRAME_STEP
        }
        return frames
    }

    private fun hammingWindow(size: Int): FloatArray {
        return FloatArray(size) { n ->
            (0.54 - 0.46 * cos(2.0 * PI * n / (size - 1))).toFloat()
        }
    }

    private fun powerSpectrum(frame: FloatArray): FloatArray {
        val n = frame.size
        val real = frame.copyOf()
        val imag = FloatArray(n)
        fft(real, imag)
        val halfN = n / 2 + 1
        return FloatArray(halfN) { i -> real[i] * real[i] + imag[i] * imag[i] }
    }

    private fun fft(real: FloatArray, imag: FloatArray) {
        val n = real.size
        var j = 0
        for (i in 1 until n) {
            var bit = n shr 1
            while (j and bit != 0) {
                j = j xor bit
                bit = bit shr 1
            }
            j = j xor bit
            if (i < j) {
                var tmp = real[i]; real[i] = real[j]; real[j] = tmp
                tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp
            }
        }
        var len = 2
        while (len <= n) {
            val ang = (2 * PI / len).toFloat()
            val wReal = cos(ang.toDouble()).toFloat()
            val wImag = sin(ang.toDouble()).toFloat()
            var i = 0
            while (i < n) {
                var curReal = 1f
                var curImag = 0f
                for (jj in 0 until len / 2) {
                    val uReal = real[i + jj]
                    val uImag = imag[i + jj]
                    val vReal = real[i + jj + len / 2] * curReal - imag[i + jj + len / 2] * curImag
                    val vImag = real[i + jj + len / 2] * curImag + imag[i + jj + len / 2] * curReal
                    real[i + jj] = uReal + vReal
                    imag[i + jj] = uImag + vImag
                    real[i + jj + len / 2] = uReal - vReal
                    imag[i + jj + len / 2] = uImag - vImag
                    val newCurReal = curReal * wReal - curImag * wImag
                    curImag = curReal * wImag + curImag * wReal
                    curReal = newCurReal
                }
                i += len
            }
            len = len shl 1
        }
    }

    private fun melFilterbank(numFilters: Int, fftSize: Int, sampleRate: Int): Array<FloatArray> {
        fun hzToMel(hz: Double) = 2595.0 * log10(1.0 + hz / 700.0)
        fun melToHz(mel: Double) = 700.0 * (10.0.pow(mel / 2595.0) - 1.0)

        val lowMel = hzToMel(0.0)
        val highMel = hzToMel(sampleRate / 2.0)
        val melPoints = DoubleArray(numFilters + 2) { i ->
            melToHz(lowMel + i * (highMel - lowMel) / (numFilters + 1))
        }
        val bins = IntArray(numFilters + 2) { i ->
            ((fftSize + 1) * melPoints[i] / sampleRate).toInt()
        }
        val halfFft = fftSize / 2 + 1
        return Array(numFilters) { m ->
            FloatArray(halfFft) { k ->
                when {
                    k < bins[m] -> 0f
                    k <= bins[m + 1] -> (k - bins[m]).toFloat() / (bins[m + 1] - bins[m]).coerceAtLeast(1)
                    k <= bins[m + 2] -> (bins[m + 2] - k).toFloat() / (bins[m + 2] - bins[m + 1]).coerceAtLeast(1)
                    else -> 0f
                }
            }
        }
    }

    private fun dct(input: FloatArray, numCoefficients: Int): FloatArray {
        val n = input.size
        return FloatArray(numCoefficients) { k ->
            var sum = 0.0
            for (i in 0 until n) {
                sum += input[i] * cos(PI * k * (2 * i + 1) / (2 * n))
            }
            (sum * sqrt(2.0 / n)).toFloat()
        }
    }
}