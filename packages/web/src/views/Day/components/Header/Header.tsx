import { type FC } from "react";
import { theme } from "@web/common/styles/theme";
import { HeaderInfoIcon } from "@web/components/HeaderInfoIcon/HeaderInfoIcon";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

interface Props {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: FC<Props> = ({
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  return (
    <div className="relative flex h-20 w-full items-baseline justify-between text-text-light">
      {!isSidebarOpen ? (
        <TooltipWrapper
          description="Open sidebar"
          onClick={onToggleSidebar}
          shortcut="["
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <SidebarIcon color={theme.color.text.lightInactive} size={21} />
          </span>
        </TooltipWrapper>
      ) : null}
      <div className="z-2 flex items-center justify-between" />

      <div className="z-2 flex h-full items-center justify-between pr-5">
        <HeaderInfoIcon />
        <SelectView />
      </div>
    </div>
  );
};
