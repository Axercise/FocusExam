"use client";
export type DashboardPanel="statistics"|"sound";
export const dashboardPanelEvent="focusexam-open-dashboard-panel";
export function openDashboardPanel(panel:DashboardPanel){window.dispatchEvent(new CustomEvent(dashboardPanelEvent,{detail:panel}));}

