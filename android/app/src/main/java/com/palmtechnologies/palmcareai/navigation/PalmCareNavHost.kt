package com.palmtechnologies.palmcareai.navigation

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
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
import com.palmtechnologies.palmcareai.ui.clients.EditClientScreen
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
import com.palmtechnologies.palmcareai.ui.theme.*

data class BottomNavItem(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val isCenter: Boolean = false
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
        BottomNavItem(NavRoutes.RECORD, "Palm It", Icons.Filled.Mic, Icons.Outlined.Mic, isCenter = true),
        BottomNavItem(NavRoutes.VISITS, "Workspace", Icons.Filled.GridView, Icons.Outlined.GridView),
        BottomNavItem(NavRoutes.SETTINGS, "Settings", Icons.Filled.Settings, Icons.Outlined.Settings)
    )

    val adminTabs = listOf(
        BottomNavItem(NavRoutes.COMMAND_CENTER, "Command", Icons.AutoMirrored.Filled.Send, Icons.AutoMirrored.Outlined.Send),
        BottomNavItem(NavRoutes.SALES_LEADS, "Leads", Icons.Filled.TrackChanges, Icons.Outlined.TrackChanges),
        BottomNavItem(NavRoutes.INVESTORS, "Investors", Icons.AutoMirrored.Filled.TrendingUp, Icons.AutoMirrored.Outlined.TrendingUp),
        BottomNavItem(NavRoutes.ANALYTICS, "Analytics", Icons.Filled.BarChart, Icons.Outlined.BarChart),
        BottomNavItem(NavRoutes.SETTINGS, "More", Icons.Filled.GridView, Icons.Outlined.GridView)
    )

    val tabs = if (isAdmin) adminTabs else userTabs
    val topLevelRoutes = tabs.map { it.route }.toSet()

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(
            navController = innerNav,
            startDestination = if (isAdmin) NavRoutes.COMMAND_CENTER else NavRoutes.HOME,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 60.dp)
        ) {
            composable(NavRoutes.HOME) { HomeScreen(navController = innerNav) }
            composable(NavRoutes.CLIENTS) { ClientsScreen(navController = innerNav) }
            composable(NavRoutes.CLIENT_DETAIL) { backStackEntry ->
                val clientId = backStackEntry.arguments?.getString("clientId") ?: return@composable
                ClientDetailScreen(clientId = clientId, navController = innerNav)
            }
            composable(NavRoutes.ADD_CLIENT) { AddClientScreen(navController = innerNav) }
            composable(NavRoutes.EDIT_CLIENT) { backStackEntry ->
                val clientId = backStackEntry.arguments?.getString("clientId") ?: return@composable
                EditClientScreen(clientId = clientId, navController = innerNav)
            }
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
            composable(NavRoutes.AGENT) { PalmAgentScreen(navController = innerNav, isAdmin = isAdmin) }
            composable(NavRoutes.COMMAND_CENTER) { CommandCenterScreen(navController = innerNav) }
            composable(NavRoutes.SALES_LEADS) { SalesLeadsScreen() }
            composable(NavRoutes.INVESTORS) { InvestorsScreen() }
            composable(NavRoutes.ANALYTICS) { AnalyticsScreen() }
        }

        // Custom tab bar — matches iOS MainTabView
        if (currentRoute in topLevelRoutes || currentRoute == null) {
            PalmTabBar(
                tabs = tabs,
                currentRoute = currentRoute,
                onTabSelected = { route ->
                    innerNav.navigate(route) {
                        popUpTo(innerNav.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }

        // Palm Agent FAB
        if (currentRoute in topLevelRoutes && currentRoute != NavRoutes.RECORD) {
            FloatingActionButton(
                onClick = { innerNav.navigate(NavRoutes.AGENT) },
                containerColor = Teal500,
                contentColor = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 20.dp, bottom = 90.dp)
                    .size(48.dp)
            ) {
                Icon(Icons.Filled.SmartToy, contentDescription = "Palm Agent", modifier = Modifier.size(22.dp))
            }
        }
    }
}

@Composable
private fun PalmTabBar(
    tabs: List<BottomNavItem>,
    currentRoute: String?,
    onTabSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(0.dp), ambientColor = Color.Black.copy(alpha = 0.06f))
    ) {
        // Top hairline
        HorizontalDivider(
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
            thickness = 0.5.dp
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(horizontal = 4.dp, vertical = 6.dp)
                .navigationBarsPadding(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabs.forEach { item ->
                val selected = currentRoute == item.route
                if (item.isCenter) {
                    // Center "Palm It" button — gradient circle like iOS
                    PalmItTabButton(
                        selected = selected,
                        onClick = { onTabSelected(item.route) },
                        label = item.label
                    )
                } else {
                    // Standard tab
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) { onTabSelected(item.route) },
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                            contentDescription = item.label,
                            tint = if (selected) Teal500 else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            item.label,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (selected) Teal500 else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PalmItTabButton(selected: Boolean, onClick: () -> Unit, label: String) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { onClick() }
    ) {
        val gradient = if (selected) {
            Brush.linearGradient(listOf(ErrorRed, ErrorRed.copy(alpha = 0.85f)))
        } else {
            Brush.linearGradient(listOf(Teal500, Teal700))
        }
        Box(
            modifier = Modifier
                .size(50.dp)
                .offset(y = (-8).dp)
                .shadow(
                    7.dp, CircleShape,
                    ambientColor = if (selected) ErrorRed.copy(alpha = 0.45f) else Teal500.copy(alpha = 0.45f)
                )
                .clip(CircleShape)
                .background(gradient),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Filled.Mic,
                contentDescription = label,
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }
        Text(
            label,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) ErrorRed else Teal500,
            modifier = Modifier.offset(y = (-8).dp)
        )
    }
}
