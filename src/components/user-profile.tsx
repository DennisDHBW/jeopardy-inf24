"use client";

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

import {
  SidebarMenuButton,
} from "@/components/ui/sidebar";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/actions/logout";
import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export function UserProfile({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {

  const [state, logoutAction, pending] = useActionState(logout, {});

  // Example of how to use the useSession hook in client-side components
  const session = useSession();

  return (
    <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage
                  src={session.data?.user.image ?? undefined}
                  alt={session.data?.user.name}
                />
                <AvatarFallback className="rounded-lg">
                  {session.data?.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {session.data?.user.name}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {session.data?.user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={session.data?.user.image ?? undefined}
                    alt={session.data?.user.name}
                  />
                  <AvatarFallback className="rounded-lg">
                    {session.data?.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session.data?.user.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {session.data?.user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <button type="submit" disabled={pending} className="w-full">
                <DropdownMenuItem disabled={pending}>
                  {pending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <IconLogout />
                  )}
                  Log out
                </DropdownMenuItem>
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
