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
        Log.d("AuthInterceptor", "${request.method} ${request.url} auth=${!token.isNullOrBlank()}")
        val response = chain.proceed(request)
        if (!response.isSuccessful) {
            Log.w("AuthInterceptor", "${request.method} ${request.url} -> ${response.code}")
        }
        return response
    }
}
