-- Profiles/EJets.lua — FSS E170-E195 (MSFS) / X-Crafts (X-Plane)
-- Reads custom L-Vars and writes to Universal ACARS Offset Block

local OFF_FUEL    = 0x66C0
local OFF_ZFW     = 0x66C4
local OFF_PBRAKE  = 0x66D0

while true do
    local fuel = 0
    local zfw  = 0

    -- Try FSS E-Jet L-Vars
    if ipc.readLvar("FSS_EJET_FUEL_TOTAL") ~= nil then
        fuel = ipc.readLvar("FSS_EJET_FUEL_TOTAL")
    end
    if ipc.readLvar("FSS_EJET_ZFW") ~= nil then
        zfw = ipc.readLvar("FSS_EJET_ZFW")
    end

    -- Fallback to standard offsets
    if fuel == 0 or fuel == nil then
        fuel = ipc.readFLT(0x0B74) or 0
    end
    if zfw == 0 or zfw == nil then
        zfw = ipc.readFLT(0x3BEC) or 0
    end

    local p_brake = ipc.readUW(0x0BC8)

    ipc.writeFLT(OFF_FUEL, fuel)
    ipc.writeFLT(OFF_ZFW, zfw)
    ipc.writeUW(OFF_PBRAKE, p_brake)

    ipc.sleep(1000)
end
