import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePersonalisedProducts, useSimilarProducts } from "./recommendations";

// ── Mock the apiClient ────────────────────────────────────────────
vi.mock("./client", () => ({
    apiClient: vi.fn(),
    hasToken: vi.fn(() => false),
}));

import { apiClient } from "./client";
const mockApiClient = vi.mocked(apiClient);

// ── Test wrapper with a fresh QueryClient per test ─────────────────
function wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── usePersonalisedProducts ────────────────────────────────────────

describe("usePersonalisedProducts", () => {
    beforeEach(() => {
        mockApiClient.mockReset();
    });

    it("calls /recommendations/for-you with the correct k param", async () => {
        const fakeProducts = [{ id: "1", title: "Shirt" }];
        mockApiClient.mockResolvedValueOnce(fakeProducts);

        const { result } = renderHook(() => usePersonalisedProducts(8), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockApiClient).toHaveBeenCalledWith("/recommendations/for-you?k=8");
        expect(result.current.data).toEqual(fakeProducts);
    });

    it("uses k=12 by default", async () => {
        mockApiClient.mockResolvedValueOnce([]);

        const { result } = renderHook(() => usePersonalisedProducts(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockApiClient).toHaveBeenCalledWith("/recommendations/for-you?k=12");
    });

    it("returns empty array gracefully when apiClient throws", async () => {
        mockApiClient.mockRejectedValueOnce(new Error("Network error"));

        const { result } = renderHook(() => usePersonalisedProducts(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});

// ── useSimilarProducts ─────────────────────────────────────────────

describe("useSimilarProducts", () => {
    beforeEach(() => {
        mockApiClient.mockReset();
    });

    it("calls /recommendations/similar/:handle with the correct params", async () => {
        const fakeProducts = [{ id: "2", title: "Trousers" }];
        mockApiClient.mockResolvedValueOnce(fakeProducts);

        const { result } = renderHook(
            () => useSimilarProducts("blue-linen-shirt", 4),
            { wrapper },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockApiClient).toHaveBeenCalledWith(
            "/recommendations/similar/blue-linen-shirt?k=4",
        );
        expect(result.current.data).toEqual(fakeProducts);
    });

    it("uses k=6 by default", async () => {
        mockApiClient.mockResolvedValueOnce([]);

        const { result } = renderHook(
            () => useSimilarProducts("any-handle"),
            { wrapper },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockApiClient).toHaveBeenCalledWith(
            "/recommendations/similar/any-handle?k=6",
        );
    });

    it("is disabled when productHandle is empty", async () => {
        const { result } = renderHook(() => useSimilarProducts(""), { wrapper });

        // Query should not fire — status stays 'pending' with no fetch
        expect(result.current.isFetching).toBe(false);
        expect(mockApiClient).not.toHaveBeenCalled();
    });

    it("returns empty array gracefully when apiClient throws", async () => {
        mockApiClient.mockRejectedValueOnce(new Error("Recommender offline"));

        const { result } = renderHook(
            () => useSimilarProducts("some-handle"),
            { wrapper },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
