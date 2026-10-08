"use client";
import { RouteError, type RouteErrorProps } from "@/components/layout/route-error";
export default function ErrorPage(props: RouteErrorProps) { return <RouteError {...props} home="/student" />; }
