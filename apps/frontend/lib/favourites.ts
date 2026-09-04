"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "./api/client";
import { getMyFavourites, addFavourite, removeFavourite } from "./api/favourites";
import type { FavouriteProduct } from "./api/favourites";
import { useFavouritesDrawer } from "./favourites-drawer";

export function useFavourites() {
  return useQuery({
    queryKey: ["favourites"],
    queryFn: getMyFavourites,
    enabled: !!getToken(),
    staleTime: 30_000,
  });
}

export function useToggleFavourite(productId: string) {
  const { openDrawer } = useFavouritesDrawer();
  const qc = useQueryClient();
  const { data: favourites } = useFavourites();

  const isFavourited = !!(favourites ?? []).find((f) => f.product_id === productId);

  const mutation = useMutation({
    mutationFn: () => (isFavourited ? removeFavourite(productId) : addFavourite(productId)),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["favourites"] });
      const prev = qc.getQueryData<FavouriteProduct[]>(["favourites"]);
      qc.setQueryData<FavouriteProduct[]>(["favourites"], (old = []) =>
        isFavourited
          ? old.filter((f) => f.product_id !== productId)
          : [
              ...old,
              {
                id: "optimistic",
                product_id: productId,
                created_at: new Date().toISOString(),
                // Filled in by the refetch in onSettled; the drawer only reads
                // these once the real row lands.
                products: {} as FavouriteProduct["products"],
              },
            ],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["favourites"], ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favourites"] });
    },
  });

  function toggle() {
    if (!getToken()) {
      // Signed-out users can't save favourites — open the drawer, whose
      // empty state explains they need to sign in, instead of yanking them
      // off the page to /login.
      openDrawer();
      return;
    }
    mutation.mutate();
  }

  return { isFavourited, toggle, isPending: mutation.isPending };
}
