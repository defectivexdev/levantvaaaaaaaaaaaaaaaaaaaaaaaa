-- Profiles/Default.lua — Standard/Generic Aircraft
-- Reads from default FSUIPC offsets and writes to Universal ACARS Offset Block
-- Used for any aircraft NOT matched by ACARS_Master.lua

local OFF_FUEL    = 0x66C0
local OFF_ZFW     = 0x66C4
local OFF_PBRAKE  = 0x66D0

while true do
    -- Standard FSUIPC offsets (work for most default/simple aircraft)
    local fuel = ipc.readFLT(0x0B74) or 0    -- Standard total fuel
    local zfw  = ipc.readFLT(0x3BEC) or 0    -- Standard ZFW
    local p_brake = ipc.readUW(0x0BC8)

    ipc.writeFLT(OFF_FUEL, fuel)
    ipc.writeFLT(OFF_ZFW, zfw)
    ipc.writeUW(OFF_PBRAKE, p_brake)

    ipc.sleep(1000)
end
