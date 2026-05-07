package com.whiteboard;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.reactive.function.client.WebClient;

@Controller
public class ExportController {

    @Value("${node.backend.url:http://localhost:5001}")
    private String nodeBackendUrl;

    private final WebClient webClient;

    public ExportController(WebClient.Builder builder) {
        this.webClient = builder
                .baseUrl("http://localhost:5001")
                .codecs(config -> config
                    .defaultCodecs()
                    .maxInMemorySize(10 * 1024 * 1024)) // 10MB
                .build();
    }

    @GetMapping("/export/preview/{boardId}")
    public String exportPreview(
            @PathVariable String boardId,
            @RequestParam String token,
            @RequestParam(defaultValue = "png") String format,
            Model model) {

        String canvasState = "{}";
        String title = "Board";

        try {
            Map response = webClient.get()
                    .uri("/api/boards/" + boardId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            System.out.println("Raw response keys: " + (response != null ? response.keySet() : "null"));

            if (response != null) {
                // Response is { board: {...}, canEdit: true }
                Object boardObj = response.get("board");
                System.out.println("Board object: " + boardObj);

                if (boardObj instanceof Map) {
                    Map board = (Map) boardObj;
                    Object cs = board.get("canvasState");
                    Object t  = board.get("title");
                    if (cs != null) canvasState = cs.toString();
                    if (t  != null) title = t.toString();
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching board: " + e.getMessage());
            e.printStackTrace();
        }

        System.out.println("Canvas state length: " + canvasState.length());
        System.out.println("Title: " + title);

        model.addAttribute("boardId",     boardId);
        model.addAttribute("boardTitle",  title);
        model.addAttribute("canvasState", canvasState);
        model.addAttribute("format",      format);
        model.addAttribute("token",       token);

        return "boardExport";
    }
}