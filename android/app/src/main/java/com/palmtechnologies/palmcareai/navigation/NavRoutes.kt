package com.palmtechnologies.palmcareai.navigation

object NavRoutes {
    const val LANDING = "landing"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT_PASSWORD = "forgot_password"
    const val MAIN = "main"
    const val HOME = "home"
    const val CLIENTS = "clients"
    const val CLIENT_DETAIL = "client_detail/{clientId}"
    const val ADD_CLIENT = "add_client"
    const val RECORD = "record"
    const val VISITS = "visits"
    const val VISIT_DETAIL = "visit_detail/{visitId}"
    const val CALENDAR = "calendar"
    const val DOCUMENTS = "documents"
    const val SETTINGS = "settings"
    const val SUBSCRIPTION = "subscription"
    const val AGENT = "agent"
    const val COMMAND_CENTER = "command_center"
    const val SALES_LEADS = "sales_leads"
    const val INVESTORS = "investors"
    const val ANALYTICS = "analytics"

    fun clientDetail(id: String) = "client_detail/$id"
    fun visitDetail(id: String) = "visit_detail/$id"
}
