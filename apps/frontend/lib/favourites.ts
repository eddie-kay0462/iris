"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getToken } from "./api/client";
import { getMyFavourites, addFavourite, removeFavourite } from "./api/favourites";

export function useFavourites() {
  return useQuery({
    queryKey: ["favourites"],
    queryFn: getMyFavourites,
    enabled: !!getToken(),
    staleTime: 30_000,
  });
}

export function useToggleFavourite(productId: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: favourites } = useFavourites();

  const isFavourited = !!(favourites ?? []).find((f) => f.product_id === productId);

  const mutation = useMutation({
    mutationFn: () => (isFavourited ? removeFavourite(productId) : addFavourite(productId)),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["favourites"] });
      const prev = qc.getQueryData(["favourites"]);
      qc.setQueryData(["favourites"], (old: any[] = []) =>
        isFavourited
          ? old.filter((f) => f.product_id !== productId)
          : [...old, { id: "optimistic", product_id: productId, created_at: new Date().toISOString(), products: {} }],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx: any) => {
      qc.setQueryData(["favourites"], ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favourites"] });
    },
  });

  function toggle() {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    mutation.mutate();
  }

  return { isFavourited, toggle, isPending: mutation.isPending };
}
