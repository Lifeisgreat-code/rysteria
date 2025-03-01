// Copyright (C) 2024 Paul Johnson
// Copyright (C) 2024-2025 Maxim Nesterov

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

#include <Client/Ui/Ui.h>

#include <string.h>

#include <Client/Game.h>
#include <Client/InputData.h>
#include <Client/Simulation.h>
#include <Client/Socket.h>
#include <Client/Ui/Engine.h>
#include <Shared/Bitset.h>
#include <Shared/pb.h>
#include <Client/DOM.h>

static void chat_bar_on_event(struct rr_ui_element *this, struct rr_game *game)
{
    if (game->input_data->mouse_buttons_up_this_tick & 1)
    {
        game->chat.chat_active = 1;
        game->menu_open = 0;
    }
}

static void chat_bar_animate(struct rr_ui_element *this, struct rr_game *game)
{
    rr_ui_default_animate(this, game);
    if (game->chat.chat_active)
    {
        this->fill = 0xffffffff;
        this->stroke = 0xff222222;
    }
    else
        this->fill = 0x80000000;
    if (rr_bitset_get_bit(game->input_data->keys_pressed_this_tick, 13))
    {
        if (game->chat.chat_active)
        {
            if (game->chat.sending[0] != 0)
            {
                struct proto_bug encoder;
                proto_bug_init(&encoder, RR_OUTGOING_PACKET);
                proto_bug_write_uint8(&encoder, game->socket.quick_verification, "qv");
                proto_bug_write_uint8(&encoder, rr_serverbound_chat, "header");
                proto_bug_write_string(&encoder, game->chat.sending, 64, "chat");
                rr_websocket_send(&game->socket, encoder.current - encoder.start);
            }
            memset(game->chat.sending, 0, sizeof game->chat.sending);
            rr_dom_set_text("_0x4523", "");
        }
        else
            game->menu_open = 0;
        game->chat.chat_active ^= 1;
    }
    if (game->menu_open != 0)
        game->chat.chat_active = 0;
    if (game->chat.chat_active)
        rr_dom_focus("_0x4523");
    else
        rr_dom_blur("_0x4523");
};

static uint8_t chat_bar_choose(struct rr_ui_element *this, struct rr_game *game)
{
    return game->chat.chat_active || game->chat.sending[0];
}

static uint8_t chat_should_show(struct rr_ui_element *this,
                                struct rr_game *game)
{
    uint8_t r = game->simulation_ready &&
                !game->cache.disable_chat &&
                !game->cache.hide_ui &&
                game->menu_open != rr_game_menu_inventory &&
                game->menu_open != rr_game_menu_gallery &&
                game->menu_open != rr_game_menu_crafting;
    if (!r)
        game->chat.chat_active = 0;
    return r;
}

static struct rr_ui_element *rr_ui_chat_text_init(struct rr_game_chat_message
*message)
{
    return rr_ui_set_justify(
        rr_ui_h_container_init(rr_ui_container_init(), 0, 10,
            rr_ui_text_init(message->text, 16, 0xffffffff),
            NULL
        ),
    -1, -1);
}

struct rr_ui_element *rr_ui_message_box_init(struct rr_game *game)
{
    return rr_ui_v_container_init(rr_ui_container_init(), 0, 10,
        rr_ui_chat_text_init(&game->chat.messages[0]),
        rr_ui_chat_text_init(&game->chat.messages[1]),
        rr_ui_chat_text_init(&game->chat.messages[2]),
        rr_ui_chat_text_init(&game->chat.messages[3]),
        rr_ui_chat_text_init(&game->chat.messages[4]),
        rr_ui_chat_text_init(&game->chat.messages[5]),
        rr_ui_chat_text_init(&game->chat.messages[6]),
        rr_ui_chat_text_init(&game->chat.messages[7]),
        rr_ui_chat_text_init(&game->chat.messages[8]),
        rr_ui_chat_text_init(&game->chat.messages[9]),
        NULL
    );
}

struct rr_ui_element *rr_ui_chat_bar_init(struct rr_game *game)
{
    struct rr_ui_element *input = rr_ui_text_input_init(200, 18, game->chat.sending, 64, "_0x4523");
    struct rr_ui_element *text = rr_ui_text_init("Press [Enter] or click here to chat", 14, 0xffffffff);
    struct rr_ui_element *inner = rr_ui_choose_element_init(
        rr_ui_flex_container_init(
            rr_ui_text_init("[Global]", 14, 0xffffffff),
            input,
            10
        ),
        text,
        chat_bar_choose
    );
    inner->prevent_on_event = 1;
    struct rr_ui_element *this = rr_ui_set_background(
        rr_ui_h_container_init(rr_ui_container_init(), 10, 0, inner, NULL),
    0x80000000);
    this->animate = chat_bar_animate;
    this->on_event = chat_bar_on_event;
    struct rr_ui_element *chat = rr_ui_v_container_init(rr_ui_container_init(), 10, 10,
        rr_ui_set_justify(rr_ui_message_box_init(game), -1, -1),
        rr_ui_set_justify(this, -1, -1),
        NULL
    );
    chat->should_show = chat_should_show;
    return chat;
}
