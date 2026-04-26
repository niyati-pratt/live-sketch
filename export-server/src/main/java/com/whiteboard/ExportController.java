package com.whiteboard;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

@Controller
public class ExportController {

    @Value("${node.backend.url:http://localhost:5001}")
    private String nodeBackendUrl;

    private final WebClient webClient;

    public ExportController(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    /**
     * GET /export/preview/{boardId}?token=JWT_TOKEN
     * Renders the board export preview as a JSP page.
     * The board's canvasState JSON is fetched from the Node backend.
     */
    @GetMapping("/export/preview/{boardId}")
    public String exportPreview(
            @PathVariable String boardId,
            @RequestParam String token,
            @RequestParam(defaultValue = "png") String format,
            Model model) {

        // Fetch board info from Node.js backend
        Map<?, ?> response = webClient.get()
                .uri(nodeBackendUrl + "/api/boards/" + boardId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .bodyToMono(Map.class)
                .onErrorResume(e -> Mono.just(Map.of("error", e.getMessage())))
                .block();

        if (response == null || response.containsKey("error")) {
            model.addAttribute("error", "Failed to load board");
            return "boardExport";
        }

        Map<?, ?> board = (Map<?, ?>) response.get("board");
        String canvasState = board != null ? (String) board.get("canvasState") : "{}";
        String title       = board != null ? (String) board.get("title")       : "Board";

        model.addAttribute("boardId",     boardId);
        model.addAttribute("boardTitle",  title);
        model.addAttribute("canvasState", canvasState);
        model.addAttribute("format",      format);
        model.addAttribute("exportUrl",   nodeBackendUrl + "/api/boards/" + boardId + "/export");
        model.addAttribute("token",       token);

        return "boardExport";
    }
}
