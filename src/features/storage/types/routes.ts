import { RouteObject } from "react-router-dom";

export type RouteConfig = {
  id: string
  title: string
  children?: RouteConfig[]
} & RouteObject;