import { useDispatch, useSelector } from "react-redux";
import { setSelected } from "../../store/slice/user/user.slice";
import { resolveAvatarUrl } from "../../utils/avatar";

const User = ({ userDetails }) => {
  const avatarUrl = resolveAvatarUrl(
    userDetails,
    userDetails?.username || userDetails?.name
  );

  const dispatch = useDispatch();
  const { selectedUser, onlineUsers, typingStatus } = useSelector(
    (state) => state.user
  );

  const isSelected = userDetails?._id === selectedUser?._id;
  const isOnline = onlineUsers?.some(
    (id) => id?.toString?.() === userDetails?._id?.toString?.()
  );
  const isTyping = Boolean(typingStatus?.[userDetails?._id]);

  const handleUserClick = () => {
    dispatch(setSelected(userDetails));
  };

  return (
    <button
      type="button"
      onClick={handleUserClick}
      className={`group mt-3 flex w-full items-center gap-4 rounded-2xl border border-transparent px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isSelected
          ? "border-primary/40 bg-white/[0.08] shadow-[0_18px_35px_-25px_rgba(99,102,241,0.8)]"
          : "bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.06]"
      }`}
    >
      <div className="relative">
        <img
          src={avatarUrl}
          alt={userDetails?.name}
          className="h-11 w-11 rounded-full border border-white/10 object-cover shadow-inner"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[#0b0f1e] ${
            isOnline ? "bg-emerald-400" : "bg-white/30"
          }`}
        />
      </div>
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-white">
          {userDetails?.name}
        </h2>
        <p className="text-xs text-white/50 transition group-hover:text-white/70">
          {isTyping ? "Typing…" : `@${userDetails?.username}`}
        </p>
      </div>
    </button>
  );
};

export default User;
