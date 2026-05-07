import { UserButton } from "./UserButton";
import { currentUser } from "@clerk/nextjs/server";
import { GlobalSearch } from "./GlobalSearch";

const Navbar = async () => {
  const user = await currentUser();
  return (
    <div className="flex items-center justify-between p-4">
      {/* GLOBAL SEARCH */}
      <GlobalSearch />

      {/* USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        {user && <UserButton />}
      </div>
    </div>
  );
};

export default Navbar;
