"use client";

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormAction } from "@/lib/use-form-action";
import { updateName } from "@/actions/account/update-name";
import { updateEmail } from "@/actions/account/update-email";
import { changeUserPassword } from "@/actions/account/change-password";
import { updateAvatar } from "@/actions/account/update-avatar";
import { toast } from "sonner";
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
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { useSession, getSession } from "@/lib/auth-client";

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

  // Local copy of displayed user data. We update this after successful actions
  // so the component reflects changes immediately without forcing a full page reload.
  const [displayUser, setDisplayUser] = useState(() => session.data?.user ?? user);

  // Type helpers because session.user shape can vary depending on runtime/version.
  const getDisplayId = () => (displayUser && (displayUser as any).id ? (displayUser as any).id : "");
  const getDisplayImage = () => (displayUser && ((displayUser as any).image ?? (displayUser as any).avatar) ? ((displayUser as any).image ?? (displayUser as any).avatar) : undefined);
  const getDisplayName = () => (displayUser && ((displayUser as any).name ?? ""));
  const getDisplayEmail = () => (displayUser && ((displayUser as any).email ?? ""));

  // Keep displayUser in sync when the session updates normally
  useEffect(() => {
    if (session.data?.user) setDisplayUser(session.data.user);
  }, [session.data?.user]);

  // form actions
  const { state: nameState, formAction: nameAction, pending: namePending } = useFormAction(
    updateName,
    { error: undefined },
  );

  const { state: emailState, formAction: emailAction, pending: emailPending } = useFormAction(
    updateEmail,
    { error: undefined },
  );

  const { state: passState, formAction: passAction, pending: passPending } = useFormAction(
    changeUserPassword,
    { error: undefined },
  );

  const { state: avatarState, formAction: avatarAction, pending: avatarPending } = useFormAction(
    updateAvatar,
    { error: undefined },
  );

  const router = useRouter();

  // dialog open states
  const [openName, setOpenName] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [openPass, setOpenPass] = useState(false);
  const [openAvatar, setOpenAvatar] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);

  // watch for results and react
  useEffect(() => {
    if (nameState && (nameState as any).success) {
      (async () => {
        setOpenName(false);
        toast.success("Name updated");
        try {
          const s = await getSession();
          // getSession may return either { data: { user } } or { user } depending on runtime/version.
          const u = (s as any)?.data?.user ?? (s as any)?.user;
          if (u) setDisplayUser(u);
        } catch (_) {
          /* ignore */
        }
      })();
    } else if (nameState && (nameState as any).error) {
      toast.error(String((nameState as any).error));
    }
  }, [nameState]);

  useEffect(() => {
    if (emailState && (emailState as any).success) {
      (async () => {
        setOpenEmail(false);
        toast.success("Email updated");
        try {
          const s = await getSession();
          const u = (s as any)?.data?.user ?? (s as any)?.user;
          if (u) setDisplayUser(u);
        } catch (_) {}
      })();
    } else if (emailState && (emailState as any).error) {
      toast.error(String((emailState as any).error));
    }
  }, [emailState]);

  useEffect(() => {
    if (passState && (passState as any).success) {
      (async () => {
        setOpenPass(false);
        toast.success("Password changed");
        try {
          const s = await getSession();
          const u = (s as any)?.data?.user ?? (s as any)?.user;
          if (u) setDisplayUser(u);
        } catch (_) {}
      })();
    } else if (passState && (passState as any).error) {
      toast.error(String((passState as any).error));
    }
  }, [passState]);

  useEffect(() => {
    if (avatarState && (avatarState as any).success) {
      (async () => {
        setOpenAvatar(false);
        toast.success("Profile picture updated");
        try {
          const s = await getSession();
          const u = (s as any)?.data?.user ?? (s as any)?.user;
          if (u) setDisplayUser(u);
        } catch (_) {}
      })();
    } else if (avatarState && (avatarState as any).error) {
      toast.error(String((avatarState as any).error));
    }
  }, [avatarState]);

  return (
    <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={getDisplayImage()} alt={getDisplayName()} />
                <AvatarFallback className="rounded-lg">{(getDisplayName()?.charAt(0) ?? "").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayUser?.name}</span>
                <span className="text-muted-foreground truncate text-xs">{displayUser?.email}</span>
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
                  <AvatarImage src={getDisplayImage()} alt={getDisplayName()} />
                  <AvatarFallback className="rounded-lg">{(getDisplayName()?.charAt(0) ?? "").toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayUser?.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{displayUser?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenAccount(true);
                }}
              >
                <IconUserCircle />
                Account
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

        {/* Account dialog (controlled) - opened by the Account menu item */}
        <Dialog open={openAccount} onOpenChange={setOpenAccount}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Account</DialogTitle>
              <DialogDescription>Manage your account details</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Profile Picture */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getDisplayImage()} />
                    <AvatarFallback>{(getDisplayName()?.charAt(0) ?? "").toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">Profile Picture</div>
                    <div className="text-muted-foreground text-sm">Your avatar</div>
                  </div>
                </div>
                <Dialog open={openAvatar} onOpenChange={setOpenAvatar}>
                  <DialogTrigger asChild>
                    <Button size="sm">Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Profile Picture</DialogTitle>
                      <DialogDescription>Upload a new profile picture.</DialogDescription>
                    </DialogHeader>

                    <form action={avatarAction} encType="multipart/form-data" className="space-y-4">
                      <input type="hidden" name="userId" value={getDisplayId()} />
                            <div className="flex flex-col gap-2">
                              <Label className="block">Choose image</Label>
                              <Input className="w-full" type="file" name="avatar" accept="image/*" />
                            </div>

                      {avatarState?.error && (
                        <div className="text-destructive mt-2">{String(avatarState.error)}</div>
                      )}

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={avatarPending}>
                          {avatarPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Name */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-medium">Name</div>
                    <div className="text-muted-foreground text-sm">{getDisplayName()}</div>
                  </div>

                <Dialog open={openName} onOpenChange={setOpenName}>
                  <DialogTrigger asChild>
                    <Button size="sm">Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Name</DialogTitle>
                      <DialogDescription>Change your display name.</DialogDescription>
                    </DialogHeader>

                    <form action={nameAction} className="space-y-4">
                      <input type="hidden" name="userId" value={getDisplayId()} />
                            <div className="flex flex-col gap-2">
                              <Label className="block">Name</Label>
                              <Input className="w-full" name="name" defaultValue={getDisplayName() ?? ""} />
                            </div>

                      {nameState?.error && <div className="text-destructive mt-2">{String(nameState.error)}</div>}

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={namePending}>
                          {namePending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-medium">Email</div>
                    <div className="text-muted-foreground text-sm">{getDisplayEmail()}</div>
                  </div>

                <Dialog open={openEmail} onOpenChange={setOpenEmail}>
                  <DialogTrigger asChild>
                    <Button size="sm">Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Email</DialogTitle>
                      <DialogDescription>Change the email associated with your account.</DialogDescription>
                    </DialogHeader>

                    <form action={emailAction} className="space-y-4">
                      <input type="hidden" name="userId" value={getDisplayId()} />
                            <div className="flex flex-col gap-2">
                              <Label className="block">Email</Label>
                              <Input className="w-full" name="email" type="email" defaultValue={getDisplayEmail() ?? ""} />
                            </div>

                      {emailState?.error && <div className="text-destructive mt-2">{String(emailState.error)}</div>}

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={emailPending}>
                          {emailPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">Password</div>
                  <div className="text-muted-foreground text-sm">********</div>
                </div>

                <Dialog open={openPass} onOpenChange={setOpenPass}>
                  <DialogTrigger asChild>
                    <Button size="sm">Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>Update your account password.</DialogDescription>
                    </DialogHeader>

                    <form action={passAction} className="space-y-4">
                      <div className="space-y-2">
                              <div className="flex flex-col gap-2">
                                <Label className="block">Current Password</Label>
                                <Input className="w-full" name="currentPassword" type="password" />
                              </div>
                              <div className="flex flex-col gap-2">
                                <Label className="block">New Password</Label>
                                <Input className="w-full" name="newPassword" type="password" />
                              </div>
                              <div className="flex flex-col gap-2">
                                <Label className="block">Confirm New Password</Label>
                                <Input className="w-full" name="confirmNewPassword" type="password" />
                              </div>
                      </div>

                      {passState?.error && <div className="text-destructive mt-2">{String(passState.error)}</div>}

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={passPending}>
                          {passPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Account sections are rendered inside the Account dialog in the dropdown */}
    </div>
  );
}
