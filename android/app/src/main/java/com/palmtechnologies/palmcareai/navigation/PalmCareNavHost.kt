package com.palmtechnologies.palmcareai.navigation

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.palmtechnologies.palmcareai.ui.auth.*
import com.palmtechnologies.palmcareai.ui.home.HomeScreen
import com.palmtechnologies.palmcareai.ui.clients.ClientsScreen
import com.palmtechnologies.palmcareai.ui.clients.ClientDetailScreen
import com.palmtechnologies.palmcareai.ui.clients.AddClientScreen
import com.palmtechnologies.palmcareai.ui.record.RecordScreen
import com.palmtechnologies.palmcareai.ui.visits.VisitsScreen
import com.palmtechnologies.palmcareai.ui.visits.VisitDetailScreen
import com.palmtechnologies.palmcareai.ui.calendar.CalendarScreen
import com.palmtechnologies.palmcareai.ui.documents.DocumentsScreen
import com.palmtechnologies.palmcareai.ui.settings.SettingsScreen
import com.palmtechnologies.palmcareai.ui.settings.SubscriptionScreen
import com.palmtechnologies.palmcareai.ui.agent.PalmAgentScreen
import com.palmtechnologies.palmcareai.ui.admin.CommandCenterScreen
import com.palmtechnologies.palmcareai.ui.admin.SalesLeadsScreen
import com.palmtechnologies.palmcareai.ui.admin.InvestorsScreen
import com.palmtechnologies.palmcareai.ui.admin.AnalyticsScreen
import com.palmtechnologies.palmcareai.ui.theme.Teal500

data class BottomNavItem(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

@Composable
fun PalmCareNavHost() {
    val authViewModel: AuthViewModel = hiltViewModel()
    val isLoggedIn by authViewModel.isLoggedIn.collectAsState()
    val isAdmin by authViewModel.isAdmin.collectAsState()

    val navController = rememberNavController()

    val startDestination = if (isLoggedIn) NavRoutes.MAIN else NavRoutes.LANDING

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(NavRoutes.LANDING) {
            LandingScreen(
                onLogin = { navController.navigate(NavRoutes.LOGIN) },
                onRegister = { navController.navigate(NavRoutes.REGISTER) }
            )
        }
        composable(NavRoutes.LOGIN) {
            LoginScreen(
                onSuccess = {
                    navController.navigate(NavRoutes.MAIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onRegister = { navController.navigate(NavRoutes.REGISTER) },
                onForgotPassword = { navController.navigate(NavRoutes.FORGOT_PASSWORD) },
                onBack = { navController.popBackStack() }
            )
        }
        composable(NavRoutes.REGISTER) {
            RegisterScreen(
                onSuccess = {
                    navController.navigate(NavRoutes.MAIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }
        composable(NavRoutes.FORGOT_PASSWORD) {
            ForgotPasswordScreen(onBack = { navController.popBackStack() })
        }
        composable(NavRoutes.MAIN) {
            MainScreen(
                isAdmin = isAdmin,
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(NavRoutes.LANDING) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}

@Composable
fun MainScreen(isAdmin: Boolean, onLogout: () -> Unit) {
    val innerNav = rememberNavController()
    val navBackStackEntry by innerNav.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val userTabs = listOf(
        BottomNavItem(NavRoutes.HOME, "Home", Icons.Filled.Home, Icons.Outlined.Home),
        BottomNavItem(NavRoutes.CLIENTS, "Clients", Icons.Filled.People, Icons.Outlined.People),
        BottomNavItem(NavRoutes.RECORD, "Palm It", Icons.Filled.Mic, Icons.Outlined.Mic),
        BottomNavItem(NavRoutes.VISITS, "Visits", Icons.Filled.Assignment, Icons.Outlined.Assignment),
        BottomNavItem(NavRoutes.SETTINGS, "Settings", Icons.Filled.Settings, Icons.Outlined.Settings)
    )

    val adminTabs = listOf(
        BottomNavItem(NavRoutes.COMMAND_CENTER, "Command", Icons.Filled.Dashboard, Icons.Outlined.Dashboard),
        BottomNavItem(NavRoutes.SALES_LEADS, "Leads", Icons.Filled.Leaderboard, Icons.Outlined.Leaderboard),
        BottomNavItem(NavRoutes.INVESTORS, "Investors", Icons.Filled.AttachMoney, Icons.Outlined.AttachMoney),
        BottomNavItem(NavRoutes.ANALYTICS, "Analytics", Icons.Filled.Analytics, Icons.Outlined.Analytics),
        BottomNavItem(NavRoutes.SETTINGS, "More", Icons.Filled.MoreHoriz, Icons.Outlined.MoreHoriz)
    )

    val tabs = if (isAdmin) adminTabs else userTabs
    val topLevelRoutes = tabs.map { it.route }.toSet()

    Scaffold(
        bottomBar = {
            if (currentRoute in topLevelRoutes || currentRoute == null) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp
                ) {
                    tabs.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                innerNav.navigate(item.route) {
                                    popUpTo(innerNav.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.label
                                )
                            },
                            label = { Text(item.label, style = MaterialTheme.typography.labelSmall) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Teal500,
                                selectedTextColor = Teal500,
                                indicatorColor = Teal500.copy(alpha = 0.12f)
                            )
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            if (currentRoute in topLevelRoutes && currentRoute != NavRoutes.RECORD) {
                FloatingActionButton(
                    onClick = { innerNav.navigate(NavRoutes.AGENT) },
                    containerColor = Teal500,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ) {
                    Icon(Icons.Filled.SmartToy, contentDescription = "Palm Agent")
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = innerNav,
            startDestination = if (isAdmin) NavRoutes.COMMAND_CENTER else NavRoutes.HOME,
            modifier = Modifier.padding(padding)
        ) {
            composable(NavRoutes.HOME) { HomeScreen(navController = innerNav) }
            composable(NavRoutes.CLIENTS) { ClientsScreen(navController = innerNav) }
            composable(NavRoutes.CLIENT_DETAIL) { backStackEntry ->
                val clientId = backStackEntry.arguments?.getString("clientId") ?: return@composable
                ClientDetailScreen(clientId = clientId, navController = innerNav)
            }
            composable(NavRoutes.ADD_CLIENT) { AddClientScreen(navController = innerNav) }
            composable(NavRoutes.RECORD) { RecordScreen(navController = innerNav) }
            composable(NavRoutes.VISITS) { VisitsScreen(navController = innerNav) }
            composable(NavRoutes.VISIT_DETAIL) { backStackEntry ->
                val visitId = backStackEntry.arguments?.getString("visitId") ?: return@composable
                VisitDetailScreen(visitId = visitId, navController = innerNav)
            }
            composable(NavRoutes.CALENDAR) { CalendarScreen() }
            composable(NavRoutes.DOCUMENTS) { DocumentsScreen() }
            composable(NavRoutes.SETTINGS) { SettingsScreen(navController = innerNav, onLogout = onLogout) }
            composable(NavRoutes.SUBSCRIPTION) { SubscriptionScreen(navController = innerNav) }
            composable(NavRoutes.AGENT) { PalmAgentScreen(navController = innerNav) }
            composable(NavRoutes.COMMAND_CENTER) { CommandCenterScreen(navController = innerNav) }
            composable(NavRoutes.SALES_LEADS) { SalesLeadsScreen() }
            composable(NavRoutes.INVESTORS) { InvestorsScreen() }
            composable(NavRoutes.ANALYTICS) { AnalyticsScreen() }
        }
    }
}
