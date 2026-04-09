package com.palmtechnologies.palmcareai.data.api

import android.util.Log
import com.palmtechnologies.palmcareai.data.local.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenManager.getToken() }
        val request = chain.request().newBuilder().apply {
            if (!token.isNullOrBlank()) {
                addHeader("Authorization", "Bearer $token")
            }
            addHeader("Accept", "application/json")
        }.build()
        Log.d(TAG, "${request.method} ${request.url} auth=${!token.isNullOrBlank()}")
        val response = chain.proceed(request)
        if (response.code == 401 && !request.url.encodedPath.contains("/auth/")) {
            Log.w(TAG, "401 on ${request.url} — token expired or invalid, clearing stored token")
            runBlocking { tokenManager.clear() }
        } else if (!response.isSuccessful) {
            Log.w(TAG, "${request.method} ${request.url} -> ${response.code}")
        }
        return response
    }

    companion object {
        private const val TAG = "AuthInterceptor"
    }
}
