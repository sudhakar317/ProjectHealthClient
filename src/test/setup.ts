import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without vitest globals, Testing Library cannot register its own cleanup, so each test would see
// the previous test's rendered output still mounted.
afterEach(() => cleanup());
